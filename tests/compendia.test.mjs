import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import './foundry-stub.mjs';
import {installCompendia,PACKS,CONTENT_VERSION,selectedActor,adventureTool,repairImportedDescriptions} from '../scripts/compendia.mjs';
const load=file=>JSON.parse(readFileSync(new URL(`../content/${file}.json`,import.meta.url),'utf8'));
class Index extends Map {find(fn){return Array.from(this.values()).find(fn);} [Symbol.iterator](){return this.values();}}
function apply(document,changes){for(const [path,value] of Object.entries(changes)){const keys=path.split('.');let parent=document;for(const key of keys.slice(0,-1))parent=parent[key]??={};parent[keys.at(-1)]=value;}}
function setup(){
 const settings=new Map([['contentVersion',''],['installContent',true]]);const packs=new Map();const writes=[];let failed=false;
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},packs,folders:[],settings:{get:(namespace,key)=>settings.get(key),set:async(namespace,key,value)=>settings.set(key,value)}};
 globalThis.Folder={async create(data){const f={...data,id:'folder'+game.folders.length,getFlag:(scope,key)=>data.flags?.[scope]?.[key]};game.folders.push(f);return f;},async createDocuments(docs,{pack}){const p=packs.get(pack);for(const d of docs){assert.ok(!d.folder||p.folders.has(d.folder),'parent created first');p.folders.set(d._id,d);}return docs;}};
 globalThis.ui={notifications:{info(){},warn(){},error(){}}};
 globalThis.fetch=async path=>({ok:true,json:async()=>load(path.split('/').at(-1).replace('.json',''))});
 foundry.documents={collections:{CompendiumCollection:{createCompendium:async metadata=>{
  const collection='world.'+metadata.name;const index=new Index();const pack={collection,documentName:metadata.type,index,folders:new Map(),locked:false,async setFolder(id){this.folder=id;},async getDocument(id){const d=index.get(id);d.items ??=[];d.pages??=[];d.results??=[];d.items.get=id=>d.items.find(i=>i._id===id);d.pages.get=id=>d.pages.find(i=>i._id===id);d.results.get=id=>d.results.find(i=>i._id===id);d.update=async changes=>apply(d,changes);d.updateEmbeddedDocuments=async(type,updates)=>{const children=type==='Item'?d.items:type==='TableResult'?d.results:d.pages;for(const u of updates)apply(children.get(u._id),u);};d.createEmbeddedDocuments=async(type,docs)=>{(type==='Item'?d.items:type==='TableResult'?d.results:d.pages).push(...structuredClone(docs));};d.deleteEmbeddedDocuments=async(type,ids)=>{const children=type==='Item'?d.items:type==='TableResult'?d.results:d.pages;for(let i=children.length-1;i>=0;i--)if(ids.includes(children[i]._id))children.splice(i,1);};return d;},async getIndex(){return index;},async configure({locked}){this.locked=locked;},documentClass:{async deleteDocuments(ids){for(const id of ids)index.delete(id);},async updateDocuments(updates){for(const u of updates)apply(index.get(u._id),u);return updates;},async createDocuments(docs,operation){assert.equal(operation.pack,collection);assert.equal(operation.keepId,true);assert.equal(operation.keepEmbeddedIds,true);assert.ok(docs.length<=25);if(failed)throw new Error('falha simulada');for(const doc of docs){assert.ok(!index.has(doc._id));index.set(doc._id,doc);writes.push(doc);}return docs;}}};packs.set(collection,pack);return pack;
 }}}};
 return {settings,packs,writes,fail:value=>failed=value};
}
test('installer creates eight native world compendia and is idempotent, preserving edits',async()=>{
 const state=setup();await installCompendia();assert.equal(state.packs.size,8);assert.equal(state.settings.get('contentVersion'),CONTENT_VERSION);
 for(const spec of PACKS)assert.equal(state.packs.get(spec.collection).index.size,load(spec.file).length);
 const actor=state.packs.get('world.d20age-bestiary').index.values().next().value;actor.name='Criatura editada pelo mestre';
 const count=state.writes.length;await installCompendia();await installCompendia({force:true});assert.equal(state.writes.length,count);assert.equal(actor.name,'Criatura editada pelo mestre');
});
test('partial failure resumes missing records and restores original pack lock',async()=>{
 const state=setup();const spec=PACKS[0];const pack=await foundry.documents.collections.CompendiumCollection.createCompendium({name:spec.name,type:spec.type});const first=load('bestiary')[0];pack.index.set(first._id,first);pack.locked=true;state.fail(true);
 await assert.rejects(installCompendia(),/falha simulada/);assert.equal(pack.locked,true);assert.equal(state.settings.get('contentVersion'),'');state.fail(false);await installCompendia();assert.equal(pack.index.size,162);assert.equal(pack.locked,true);
});
test('all sources are loaded before writing and players cannot install',async()=>{
 const state=setup();globalThis.fetch=async()=>({ok:false,status:404});await assert.rejects(installCompendia(),/organização/);assert.equal(state.packs.size,0);game.user.isGM=false;await assert.rejects(installCompendia(),/Somente o mestre/);assert.equal(state.writes.length,0);
});
test('actor macros reject ambiguous token selection or missing ownership',()=>{
 setup();globalThis.canvas={tokens:{controlled:[{actor:{}},{actor:{}}]}};assert.throws(selectedActor,/apenas um/);
 canvas.tokens.controlled=[{actor:{isOwner:false}}];assert.throws(selectedActor,/proprietário/);canvas.tokens.controlled=[];assert.throws(selectedActor,/Selecione um token/);
});
test('damage keeps negative HP, healing is capped, and world time requires GM',async()=>{
 setup();const actor={name:'Teste',id:'a',isOwner:true,system:{hp:{value:2,max:10}},async update(data){this.system.hp.value=data['system.hp.value'];}};globalThis.canvas={tokens:{controlled:[{actor}]}};
 foundry.applications.api.DialogV2.prompt=async()=>-5;await adventureTool('hp');assert.equal(actor.system.hp.value,-3);
 foundry.applications.api.DialogV2.prompt=async()=>100;await adventureTool('hp');assert.equal(actor.system.hp.value,10);
 game.user.isGM=false;await assert.rejects(adventureTool('turn'),/Somente o mestre/);
});

test('0.2.0 upgrade organizes existing records and images without replacing statistics or custom portraits',async()=>{
 const state=setup();state.settings.set('contentVersion','0.2.0');
 const spec=PACKS[0];const pack=await foundry.documents.collections.CompendiumCollection.createCompendium({name:spec.name,type:spec.type});
 const [first,second]=load('bestiary');first.folder=null;first.img='systems/d20age/assets/crest.svg';first.system.hp.max=777;first.name='Nome do mestre';first.items[0].img='systems/d20age/assets/crest.svg';second.img='worlds/campaign/my-portrait.png';
 pack.index.set(first._id,first);pack.index.set(second._id,second);
 await installCompendia();assert.equal(first.system.hp.max,777);assert.equal(first.name,'Nome do mestre');assert.match(first.img,/assets\/icons/);assert.match(first.items[0].img,/assets\/icons/);assert.equal(second.img,'worlds/campaign/my-portrait.png');
 assert.ok(pack.folders.has(first.folder));assert.equal(game.folders.length,6);assert.ok(pack.folder);
});

test('legacy compendia receive individual descriptions, embedded powers and reference pages once',async()=>{
 const state=setup();state.settings.set('contentVersion','0.2.1');
 const legacy=JSON.parse(readFileSync(new URL('fixtures/legacy-descriptions.json',import.meta.url),'utf8'));
 for(const [file,docs] of Object.entries(legacy).filter(([key])=>key!=='dragonVariants')){
  const spec=PACKS.find(p=>p.file===file);const pack=await foundry.documents.collections.CompendiumCollection.createCompendium({name:spec.name,type:spec.type});
  for(const doc of docs)pack.index.set(doc._id,doc);pack.locked=true;
 }
 const herb=legacy.equipment[0];herb.system.quantity=7;herb.img='worlds/custom-herb.png';
 const carpet=legacy.bestiary[0];carpet.system.hp.max=99;
 await installCompendia();
 assert.equal(herb.system.description,load('equipment').find(d=>d._id===herb._id).system.description);
 assert.doesNotMatch(herb.system.description,/Alecrim|ESTALAGENS/);assert.equal(herb.system.quantity,7);assert.equal(herb.img,'worlds/custom-herb.png');
 const canonical=load('bestiary').find(d=>d._id===carpet._id);
 assert.equal(carpet.system.hp.max,99);assert.deepEqual(carpet.items.map(i=>i._id).sort(),canonical.items.map(i=>i._id).sort());
 for(const table of legacy.rolltables){const fixed=load('rolltables').find(t=>t._id===table._id);assert.deepEqual(table.results.map(r=>r.description),fixed.results.map(r=>r.description));}
 const journal=legacy.references[0];assert.match(journal.pages.find(p=>p.type==='text').text.content,/<table>/);assert.doesNotMatch(journal.pages.find(p=>p.type==='text').text.content,/Estalagens|Pernoite/);
 for(const file of Object.keys(legacy).filter(key=>key!=='dragonVariants'))assert.equal(state.packs.get('world.d20age-'+file).locked,true);
 for(const old of legacy.abilities)assert.equal(state.packs.get('world.d20age-abilities').index.has(old._id),false);
 herb.system.description='Texto editado depois da revisão.';await installCompendia({force:true});assert.equal(herb.system.description,'Texto editado depois da revisão.');
});

test('already imported book copies are corrected only when their prose exactly matches a legacy description',async()=>{
 setup();const legacy=JSON.parse(readFileSync(new URL('fixtures/legacy-descriptions.json',import.meta.url),'utf8'));
 const herb={...structuredClone(legacy.equipment[0]),id:'world-herb',documentName:'Item',async update(u){apply(this,u);}};
 const custom={...structuredClone(legacy.equipment[0]),id:'custom-herb',documentName:'Item',async update(){throw Error('custom item must not be touched');}};custom.system.description+='\nAnotação do mestre.';
 const actor={...structuredClone(legacy.bestiary[0]),id:'world-carpet',documentName:'Actor',async update(u){apply(this,u);},async updateEmbeddedDocuments(type,updates){for(const u of updates)apply(this.items.find(i=>i._id===u._id),u);}};
 game.items=[herb,custom];game.actors=[actor];game.scenes=[];
 const sources=PACKS.map(spec=>({spec,docs:load(spec.file)}));const migration=load('description-migration');
 await repairImportedDescriptions(sources,migration);
 assert.equal(herb.system.description,load('equipment').find(i=>i.name===herb.name).system.description);
 assert.equal(actor.system.biography,load('bestiary').find(i=>i.name===actor.name).system.biography);
 const canonical=load('bestiary').find(i=>i.name===actor.name);
 for(const item of actor.items){const fixed=canonical.items.find(i=>i._id===item._id);if(fixed)assert.equal(item.system.description,fixed.system.description);}
 await repairImportedDescriptions(sources,migration);
});

test('description migration works in HTTP sessions without browser crypto',async()=>{
 setup();const legacy=JSON.parse(readFileSync(new URL('fixtures/legacy-descriptions.json',import.meta.url),'utf8'));
 const item={...structuredClone(legacy.equipment[0]),id:'http-herb',documentName:'Item',async update(u){apply(this,u);}};
 game.items=[item];game.actors=[];game.scenes=[];
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});
 try{await repairImportedDescriptions(PACKS.map(spec=>({spec,docs:load(spec.file)})),load('description-migration'));assert.equal(item.system.description,load('equipment').find(i=>i.name===item.name).system.description);}
 finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto;}
});

test('identical legacy dragon breath text is corrected to the owning dragon variant',async()=>{
 setup();const legacy=JSON.parse(readFileSync(new URL('fixtures/legacy-descriptions.json',import.meta.url),'utf8'));
 game.actors=legacy.dragonVariants.map(d=>({...structuredClone(d),documentName:'Actor',async update(u){apply(this,u);},async updateEmbeddedDocuments(type,updates){for(const u of updates)apply(this.items.find(i=>i._id===u._id),u);}}));
 game.items=[];game.scenes=[];
 await repairImportedDescriptions(PACKS.map(spec=>({spec,docs:load(spec.file)})),load('description-migration'));
 const blue=game.actors.find(a=>a.name.startsWith('Dragão azul')).items.find(i=>i.name.startsWith('Baforada'));
 const red=game.actors.find(a=>a.name.startsWith('Dragão vermelho')).items.find(i=>i.name.startsWith('Baforada'));
 assert.match(blue.system.description,/SV-C/);assert.match(red.system.description,/SV-I/);
 assert.match(blue.system.description,/raio/);assert.match(red.system.description,/fogo/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {classAvailable} from '../scripts/homebrew.mjs';
import {progression} from '../scripts/rules.mjs';
import {readFileSync} from 'node:fs';
test('as classes opcionais exigem homebrew e preservam as tabelas de progressão',()=>{
 for(const id of ['druid','paladin','yogi']){
  assert.equal(classAvailable(id,false),false);
  assert.equal(classAvailable(id,true),true);
  assert.ok(readFileSync(new URL(`../assets/classes/${id}.png`,import.meta.url)).length>10000);
 }
 assert.equal(classAvailable('fighter',false),true);
 assert.deepEqual(progression('druid',9).slots,[2,2,2,2,1]);
 assert.equal(progression('paladin',4).saves.death,8);
 assert.equal(progression('yogi',10).thac0,10);
});

test('retratos homebrew apontam a tokens circulares existentes',async()=>{
 const {roundTokenPath,prepareDefaultToken}=await import('../scripts/tokens.mjs');
 for(const id of ['druid','paladin','yogi']){
  const img=`systems/d20age/assets/classes/${id}.png`;
  const token=roundTokenPath(img);
  assert.equal(token,`systems/d20age/assets/tokens/${id}.svg`);
  assert.match(readFileSync(new URL(`../assets/tokens/${id}.svg`,import.meta.url),'utf8'),/clipPath/);
  let update;
  prepareDefaultToken({type:'character',updateSource:data=>{update=data;}},{img});
  assert.equal(update['prototypeToken.texture.src'],token);
 }
});

test('todas as classes abrem nos dois estilos mesmo com configuração indisponível e dados derivados pendentes',async()=>{
 await import('./foundry-stub.mjs');
 const {actorView}=await import('../scripts/view.mjs');
 const {ALL_CLASSES}=await import('../scripts/rules.mjs');
 const fixture=JSON.parse(readFileSync(new URL('../preview/sample.json',import.meta.url))).fighter;
 const previous=game.settings.get;
 game.settings.get=()=>{throw Error('Setting unavailable during reload');};
 try{for(const id of Object.keys(ALL_CLASSES))for(const style of ['standard','ink']){
  const actor=structuredClone(fixture);actor.system.classId=id;delete actor.system.derived;
  const html=actorView(actor,{style});assert.ok(html.includes('name="system.hp.value"'));assert.ok(html.includes(`value="${id}" selected`));
 }}finally{game.settings.get=previous;}
});

test('referências homebrew têm páginas legíveis, retratos fluidos e IDs únicos',()=>{
 const docs=JSON.parse(readFileSync(new URL('../content/homebrew.json',import.meta.url)));
 for(const doc of docs){
  assert.equal(new Set(doc.pages.map(p=>p._id)).size,doc.pages.length);
  assert.ok(doc.pages.every(p=>/^[a-zA-Z0-9]{16}$/.test(p._id)));
  assert.equal(doc.pages[0].type,'text');assert.match(doc.pages[0].text.content,/height:auto/);
  assert.ok(doc.pages.some(p=>p.name==='Progressão de Classe'&&p.text.content.includes('<table>')));
  assert.ok(doc.pages.every(p=>!p.text.content.includes('<pre')));
 }
});

test('atualização do compêndio migra conteúdo antigo, preserva páginas extras e restaura bloqueio',async()=>{
 const {installHomebrew}=await import('../scripts/homebrew.mjs');
 const docs=JSON.parse(readFileSync(new URL('../content/homebrew.json',import.meta.url)));
 const previousGame=globalThis.game,previousFetch=globalThis.fetch;
 const entries=new Map(docs.map(d=>[d._id,{flags:{},pages:new Map([...d.pages.map(p=>[p._id,{id:p._id}]),['custompage1234567',{id:'custompage1234567'}]]),async deleteEmbeddedDocuments(t,ids){ids.forEach(id=>this.pages.delete(id));},async updateEmbeddedDocuments(t,ps){for(const p of ps)this.pages.set(p._id,{...p,id:p._id});},async createEmbeddedDocuments(t,ps){for(const p of ps)this.pages.set(p._id,{...p,id:p._id});},async update(data){this.flags.d20age={homebrewRevision:data['flags.d20age.homebrewRevision']};}}]));
 for(const entry of entries.values()){entry.pages.filter=fn=>[...entry.pages.values()].filter(fn);}
 const locks=[];const pack={locked:true,async getIndex(){return entries;},async getDocument(id){return entries.get(id);},async configure({locked}){locks.push(locked);}};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},packs:new Map([['world.d20age-homebrew',pack]])};
 globalThis.fetch=async()=>({ok:true,json:async()=>docs});
 try{await installHomebrew();for(const entry of entries.values()){assert.ok(entry.pages.has('custompage1234567'));assert.equal(entry.flags.d20age.homebrewRevision,2);}assert.deepEqual(locks,[false,true]);}finally{globalThis.game=previousGame;globalThis.fetch=previousFetch;}
});

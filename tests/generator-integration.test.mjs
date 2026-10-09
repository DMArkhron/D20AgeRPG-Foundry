import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,setPath} from './foundry-stub.mjs';
import {D20AgeActorData} from '../scripts/models.mjs';
import {initialDraft} from '../scripts/generation.mjs';
import {applyCharacterDraft} from '../scripts/generator.mjs';
import {GeneratorController} from '../scripts/generator-controller.mjs';
const content=Object.fromEntries(['equipment','spells'].map(n=>[n,JSON.parse(readFileSync(new URL(`../content/${n}.json`,import.meta.url)))]));
const draft=()=>({...initialDraft(),classId:'fighter',name:'Mestre das Trilhas',values:{str:13,int:9,wis:12,dex:10,con:13,cha:8},hpDie:5,goldRoll:10,specialization:'Espada longa',portrait:false});
function actor(){return {name:'Ficha vazia',img:'custom.webp',type:'character',system:defaults(D20AgeActorData),isOwner:true,items:[{id:'custom-item',name:'Registro original',type:'ability',system:{description:'Escrito pela mesa'}}],flags:{d20age:{}},prototypeToken:{texture:{src:'custom-token.webp'}},getFlag(ns,k){return this.flags[ns]?.[k]},toObject(){return structuredClone({name:this.name,img:this.img,system:this.system})},async createEmbeddedDocuments(type,docs){const created=docs.map((d,i)=>({...structuredClone(d),id:'generated-'+i}));this.items.push(...created);return created},async deleteEmbeddedDocuments(type,ids){this.items=this.items.filter(i=>!ids.includes(i.id))},async update(updates){for(const [k,v] of Object.entries(updates))setPath(this,k,v);return this}};}
test('generator creates an owned linked Actor only after the final valid draft, and permission failures write nothing',async()=>{
 const original=Actor.create;let written=[];Actor.create=async d=>{written.push(d);return d};
 try{await assert.rejects(applyCharacterDraft(draft(),content,{user:{id:'p',can:()=>false}}),/permissão/);assert.equal(written.length,0);const data=await applyCharacterDraft(draft(),content,{user:{id:'p',can:()=>true}});assert.equal(written.length,1);assert.equal(data.ownership.p,3);assert.equal(data.prototypeToken.actorLink,true);assert.equal(data.system.hp.max,6);}finally{Actor.create=original;}
});
test('existing first-level sheet keeps custom records and portrait, records the original setup and refuses duplicate generation',async()=>{
 const a=actor();a.system.notes='Nota antiga';await applyCharacterDraft(draft(),content,{actor:a,user:{id:'p'}});
 assert(a.items.some(i=>i.id==='custom-item'));assert.equal(a.img,'custom.webp');assert.equal(a.prototypeToken.texture.src,'custom-token.webp');assert.equal(a.system.hp.max,6);assert(a.system.notes.includes('Nota antiga'));assert.equal(a.flags.d20age.creationOriginal.name,'Ficha vazia');assert.equal(a.flags.d20age.characterCreation.version,'0.3.1');
 const count=a.items.length;await assert.rejects(applyCharacterDraft(draft(),content,{actor:a,user:{id:'p'}}),/já foi/);assert.equal(a.items.length,count);
});
test('failed first-level update removes only newly added items and permission checks reject creatures or higher levels',async()=>{
 const a=actor();a.update=async()=>{throw new Error('Falha de gravação')};await assert.rejects(applyCharacterDraft(draft(),content,{actor:a,user:{id:'p'}}),/Falha/);assert.equal(a.items.length,1);assert.equal(a.items[0].id,'custom-item');
 const b=actor();b.isOwner=false;await assert.rejects(applyCharacterDraft(draft(),content,{actor:b,user:{id:'p'}}),/proprietário/);b.isOwner=true;b.system.level=2;await assert.rejects(applyCharacterDraft(draft(),content,{actor:b,user:{id:'p'}}),/nível 1/);b.system.level=1;b.type='creature';await assert.rejects(applyCharacterDraft(draft(),content,{actor:b,user:{id:'p'}}),/personagem/);
});
test('cancel produces no actor and simultaneous finish clicks produce only one commit',async()=>{
 let count=0;let release;const pending=new Promise(r=>release=r);const c=new GeneratorController(content,{finish:async()=>{count++;await pending;return true}});c.draft=draft();c.draft.step=5;
 const first=c.act('finish');await Promise.resolve();await c.act('finish');release();await first;await c.act('finish');assert.equal(count,1);
 const cancel=new GeneratorController(content,{finish:()=>count++,cancel:()=>true});await cancel.act('cancel');cancel.draft=draft();await cancel.act('finish');assert.equal(count,1);
});

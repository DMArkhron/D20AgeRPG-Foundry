import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {actorView,itemView} from '../scripts/view.mjs';
import {deriveActor} from '../scripts/rules.mjs';
const samples=JSON.parse(fs.readFileSync(new URL('../preview/sample.json',import.meta.url)));
test('seções permanecem acessíveis pelas sete abas laterais',()=>{
 const actor=structuredClone(samples.fighter);actor.system.derived=deriveActor(actor.type,actor.system,actor.items);
 for(const tab of ['attributes','equipment','abilities','magic','notes','adventure','adjustments']) {
  const html=actorView(actor,{tab});assert.ok(html.includes('sheet-side-tabs'));assert.ok(!html.includes('class="sheet-tabs"'));
  assert.equal((html.match(/data-action="section"/g)||[]).length,7);assert.ok(html.includes(`data-section="${tab}" class="side-tab active" aria-pressed="true"`));
 }
});
test('editores de registros preservam campos únicos e compartilhamento da descrição',()=>{
 const items=Object.values(samples).flatMap(actor=>actor.items);
 items.push({...structuredClone(items[0]),type:'ability'});
 for(const item of items) {
  const html=item.type==='spell'?['basic','effects','description'].map(spellTab=>itemView(item,{spellTab})).join(''):itemView(item),names=[...html.matchAll(/name="([^"]+)"/g)].map(match=>match[1]).filter(n=>n!=='name');
  assert.equal(new Set(names).size,names.length);assert.ok(names.includes('system.description'));assert.equal(names.includes('system.properties'),item.type!=='spell');if(item.type==='spell'){assert.ok(names.includes('system.target'));assert.ok(!names.includes('system.save'));}assert.ok(html.includes('data-action="item-chat"'));
 }
});
test('visão de combate aparece apenas na aba Atributos',()=>{
 for(const actor of Object.values(samples).filter(actor=>actor.type==="character")) {
  const copy=structuredClone(actor);copy.system.derived=deriveActor(copy.type,copy.system,copy.items);
  const equipment=actorView(copy,{tab:'attributes'});
  for(const section of ['vitals','experience','saves','attacks']) assert.ok(equipment.includes(`class="${section}"`));
  for(const tab of ['equipment','abilities','magic','notes','adjustments']) {
   const html=actorView(copy,{tab});
   for(const section of ['vitals','experience','saves','attacks']) assert.ok(!html.includes(`class="${section}"`));
   assert.ok(!html.includes('name="system.hp.value"'));assert.ok(html.includes('identity-record'));assert.ok(html.includes('portrait-view'));
  }
 }
});

test('equipamentos e habilidades têm listas separadas',()=>{
 const actor=structuredClone(samples.fighter);actor.items.push({...structuredClone(actor.items[0]),id:'ability-only',name:'Habilidade exclusiva',type:'ability'});actor.system.derived=deriveActor(actor.type,actor.system,actor.items);
 const equipment=actorView(actor,{tab:'equipment'}),abilities=actorView(actor,{tab:'abilities'});
 assert.ok(equipment.includes('data-type="weapon"'));assert.ok(equipment.includes('data-type="armor"'));assert.ok(equipment.includes('data-type="equipment"'));
 assert.ok(!equipment.includes('Habilidade exclusiva'));assert.ok(!equipment.includes('data-type="ability"'));
 assert.ok(abilities.includes('Habilidade exclusiva'));assert.ok(abilities.includes('data-type="ability"'));assert.ok(!abilities.includes('data-type="weapon"'));
});

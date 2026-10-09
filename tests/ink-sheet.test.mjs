import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './foundry-stub.mjs';
import {actorView} from '../scripts/view.mjs';
import {deriveActor} from '../scripts/rules.mjs';
import {D20AgeInkActorSheet,D20AgeActorSheet} from '../scripts/sheets.mjs';
const actor=JSON.parse(fs.readFileSync(new URL('../preview/sample.json',import.meta.url))).fighter;
actor.system.derived=deriveActor(actor.type,actor.system,actor.items);
const names=html=>[...html.matchAll(/\bname="([^"]+)"/g)].map(m=>m[1]).sort();
test('codex has a separate composition but preserves each document field exactly once',()=>{
 for(const tab of ['attributes','equipment','abilities','magic','notes','adventure','adjustments']){
  const a=actorView(actor,{tab}),b=actorView(actor,{tab,style:'ink'});
  assert.deepEqual(names(b),names(a),tab);assert.equal(names(b).length,new Set(names(b)).size,tab);
  assert.ok(b.includes('ink-frontispiece'));assert.ok(b.includes('ink-chapters'));
  assert.ok(!b.includes('sheet-side-tabs'));assert.ok(!a.includes('ink-frontispiece'));
  assert.equal(b.includes('ink-cartouches'),tab==='attributes');
  assert.equal(b.includes('name="system.hp.value"'),tab==='attributes');
 }
});
test('codex inherits actions and read-only protection from the registered actor sheet',async()=>{
 assert.ok(D20AgeInkActorSheet.prototype instanceof D20AgeActorSheet);
 const copy=structuredClone(actor);let writes=0;copy.update=async()=>writes++;
 const sheet=new D20AgeInkActorSheet(copy);sheet.isEditable=false;
 await D20AgeActorSheet.onSubmit.call(sheet,null,null,{object:{'system.hp.value':99}});
 assert.equal(writes,0);
});

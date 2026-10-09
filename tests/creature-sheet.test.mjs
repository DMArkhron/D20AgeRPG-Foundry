import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './foundry-stub.mjs';
import {actorView} from '../scripts/view.mjs';
import {deriveActor} from '../scripts/rules.mjs';
import {commonCreatureSave} from '../scripts/adjustments.mjs';
import {D20AgeCreatureSheet} from '../scripts/sheets.mjs';
const actor=JSON.parse(fs.readFileSync(new URL('../preview/sample.json',import.meta.url))).creature;
actor.system.derived=deriveActor(actor.type,actor.system,actor.items);
test('criatura tem ficha independente sem campos de personagem',()=>{
 const html=actorView(actor);assert.ok(html.includes('creature-paper'));assert.ok(!html.includes('sheet-side-tabs'));
 for(const field of ['system.classId','system.level','system.xp','system.coins.gp'])assert.ok(!html.includes(`name="${field}"`));
 for(const field of ['system.hitDice','system.morale','system.hp.value','system.combat.ac','system.combat.thac0','system.movement.base'])assert.ok(html.includes(`name="${field}"`));
 assert.equal(D20AgeCreatureSheet.DEFAULT_OPTIONS.position.width,620);
});
test('SV comum atualiza somente alvos e valida entrada',()=>{
 const changes=commonCreatureSave(15);assert.equal(Object.keys(changes).length,5);assert.ok(Object.values(changes).every(v=>v===15));assert.throws(()=>commonCreatureSave(''));assert.throws(()=>commonCreatureSave(1.5));
});
test('aplicar SV comum respeita permissão da criatura',async()=>{
 const copy=structuredClone(actor);copy.isOwner=true;const changes=[];copy.items={get:()=>undefined};copy.update=async data=>changes.push(data);
 const sheet=new D20AgeCreatureSheet(copy);const target={dataset:{action:'creature-save'},closest:()=>({querySelector:()=>({value:'14'})})};
 await sheet.handleAction(target);assert.deepEqual(changes,[commonCreatureSave(14)]);
 sheet.isEditable=false;await sheet.handleAction(target);assert.equal(changes.length,1);
});

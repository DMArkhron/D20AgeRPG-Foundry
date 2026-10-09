import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustmentUpdate} from '../scripts/adjustments.mjs';
import {chatCard} from '../scripts/chat.mjs';
import {actorView} from '../scripts/view.mjs';
import {deriveActor} from '../scripts/rules.mjs';
import fs from 'node:fs';
const sample=JSON.parse(fs.readFileSync(new URL('../preview/sample.json',import.meta.url))).fighter;
test('incrementos aceitam apenas bônus previstos e passos unitários',()=>{
 assert.deepEqual(adjustmentUpdate(sample.system,{action:'adjust-step',path:'system.combat.attackBonus',delta:'1'}),{'system.combat.attackBonus':sample.system.combat.attackBonus+1});
 assert.equal(adjustmentUpdate(sample.system,{action:'adjust-step',path:'system.hp.value',delta:'1'}),null);
 assert.equal(adjustmentUpdate(sample.system,{action:'adjust-step',path:'system.combat.attackBonus',delta:'99'}),null);
});
test('zerar defesa preserva CA manual e modo de cálculo',()=>{
 assert.deepEqual(adjustmentUpdate(sample.system,{action:'adjust-reset',group:'defense'}),{'system.combat.acAdjustment':0});
 assert.equal(adjustmentUpdate(sample.system,{action:'adjust-reset',group:'unknown'}),null);
 assert.equal(Object.keys(adjustmentUpdate(sample.system,{action:'adjust-reset',group:'attributes'})).length,6);
});
test('valores manuais ficam inativos no automático e disponíveis no manual',()=>{
 const actor=structuredClone(sample);actor.system.derived=deriveActor(actor.type,actor.system,actor.items);
 assert.match(actorView(actor,{tab:'adjustments'}),/name="system.combat.ac"[^>]* disabled/);
 actor.system.combat.autoArmor=false;
 assert.doesNotMatch(actorView(actor,{tab:'adjustments'}),/name="system.combat.ac"[^>]* disabled/);
});
test('cartões escapam nomes, descrições e dados da mesa',()=>{
 const html=chatCard({title:'<script>x</script>',description:'<img src=x onerror=x>',rows:[['CA','<b>3</b>']]});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;b&gt;3'));
});

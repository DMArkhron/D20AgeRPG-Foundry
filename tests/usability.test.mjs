import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,setPath,diceQueue,messages,warnings} from './foundry-stub.mjs';
import {D20AgeActorData,D20AgeItemData} from '../scripts/models.mjs';
import {D20AgeActor,D20AgeItem} from '../scripts/documents.mjs';
import {D20AgeActorSheet,D20AgeItemSheet} from '../scripts/sheets.mjs';
import {rollInitiative,initiativeSummary} from '../scripts/initiative.mjs';
import {memoryModeUpdate,memoryStepUpdate,memoryLimit} from '../scripts/memorization.mjs';
import {spellGroupEnabled,spellGroupUpdate,spellStepUpdate} from '../scripts/spell-editor.mjs';
import {actorView,itemView,spellCapacity} from '../scripts/view.mjs';
function setup(){
 globalThis.game={settings:{get:()=>undefined},user:{id:'gm',isGM:true,targets:new Set()},users:[{id:'gm',isGM:true}]};
 globalThis.canvas={scene:{id:'scene',tokens:[]},tokens:{controlled:[]}};
 diceQueue.length=messages.length=warnings.length=0;
 foundry.applications.api.DialogV2.confirm=async()=>true;
 foundry.applications.api.DialogV2.prompt=async()=>null;
 let creates=0;
 CONFIG.Combat.documentClass={create:async(data)=>{creates++;assert.equal(data.scene,'scene');assert.equal(data.active,true);return game.combat=makeCombat();}};
 CONFIG.Token={documentClass:{createCombatants:async(tokens,{combat})=>{for(const t of tokens)combat.combatants.push({id:`c-${t.id}`,name:t.name,actor:t.actor,actorId:t.actorId,tokenId:t.id,sceneId:t.parent.id,isOwner:t.actor.isOwner,initiative:null});}}};
 return ()=>creates;
}
function makeCombat(){return {combatants:[],async setInitiative(id,value){this.combatants.find(c=>c.id===id).initiative=value;}};}
function actor(type='character',id='a'){const a=new D20AgeActor({type,system:defaults(D20AgeActorData)});Object.assign(a,{id,uuid:`Actor.${id}`,flags:{}});a.prepareDerivedData();return a;}
function token(a,id='t'){const t={id,name:'Token '+id,actor:a,actorId:a.id,isOwner:a.isOwner,parent:canvas.scene};canvas.scene.tokens.push(t);return t;}
function spell(a){const s=new D20AgeItem({type:'spell',system:defaults(D20AgeItemData)});Object.assign(s,{actor:a,isOwner:true,flags:{}});return s;}
test('selected tokens enter an empty tracker before the shared initiative is assigned',async()=>{
 setup();game.combat=makeCombat();const a=actor(),b=actor('creature','b'),t1=token(a),t2=token(b,'t2');canvas.tokens.controlled=[{document:t1},{document:t2}];diceQueue.push(4);
 await rollInitiative({group:true});assert.deepEqual(game.combat.combatants.map(c=>c.initiative),[4,4]);assert.equal(messages.length,1);assert.match(messages[0].flavor,/Registrada no rastreador/);
 assert.equal(initiativeSummary(a),'Iniciativa: 4');
});
test('GM creates and activates a scene encounter; repeat rolls do not duplicate tokens',async()=>{
 const creates=setup(),a=actor();token(a);diceQueue.push(3,5);await rollInitiative({actor:a});await rollInitiative({actor:a});assert.equal(creates(),1);assert.equal(game.combat.combatants.length,1);assert.equal(game.combat.combatants[0].initiative,5);
});
test('party and foe buttons include scene tokens even without prior combatants',async()=>{
 setup();const a=actor(),b=actor('creature','b');token(a);token(b,'t2');diceQueue.push(2,6);await rollInitiative({group:true,side:'party'});await rollInitiative({group:true,side:'foes'});assert.deepEqual(game.combat.combatants.map(c=>c.initiative),[2,6]);
});
test('players cannot open an encounter or roll other owners; no fake untracked roll is posted',async()=>{
 setup();const a=actor();const t=token(a);game.user.isGM=false;await assert.rejects(rollInitiative({actor:a}),/mestre/);assert.equal(messages.length,0);assert.equal(game.combat,undefined);
 game.combat=makeCombat();a.isOwner=false;canvas.tokens.controlled=[{document:t}];await assert.rejects(rollInitiative({group:true}),/editar/);assert.equal(game.combat.combatants.length,0);
});
test('an owner can add its own token and record initiative in an existing encounter',async()=>{
 setup();game.user.isGM=false;game.combat=makeCombat();const a=actor();token(a);diceQueue.push(1);await rollInitiative({actor:a});assert.equal(game.combat.combatants[0].initiative,1);
});
test('unlinked creature initiative affects only the selected exemplar',async()=>{
 setup();game.combat=makeCombat();const a=actor('creature'),b=actor('creature');a.isToken=b.isToken=true;a.token=token(a,'t1');b.token=token(b,'t2');a.uuid='Scene.scene.Token.t1.Actor.a';b.uuid='Scene.scene.Token.t2.Actor.a';
 await CONFIG.Token.documentClass.createCombatants([a.token,b.token],{combat:game.combat});diceQueue.push(4);await rollInitiative({actor:a});assert.deepEqual(game.combat.combatants.map(c=>c.initiative),[4,null]);assert.equal(initiativeSummary(b),'Aguardando rolagem');
});
test('ambiguous world-token choice can be cancelled without changing combat',async()=>{
 setup();const a=actor();token(a,'t1');token(a,'t2');await rollInitiative({actor:a});assert.equal(game.combat,undefined);assert.equal(messages.length,0);
});
test('no token or combatant is a useful error instead of an untracked chat roll',async()=>{
 setup();await assert.rejects(rollInitiative({actor:actor()}),/Coloque um token/);assert.equal(messages.length,0);
});
test('manual capacity starts from class limits and survives automatic mode and leveling',async()=>{
 setup();const a=actor();a.system.classId='arcanist';a.system.level=3;a.prepareDerivedData();assert.equal(memoryLimit(a.system,2),1);
 await a.update(memoryModeUpdate(a.system,true));assert.equal(a.system.magicCapacity.slots['2'],1);
 await a.update(memoryStepUpdate(a.system,{circle:2,delta:1}));assert.equal(memoryLimit(a.system,2),2);
 await a.update(memoryModeUpdate(a.system,false));assert.equal(memoryLimit(a.system,2),1);
 await a.update({'system.level':5});await a.update(memoryModeUpdate(a.system,true));assert.equal(memoryLimit(a.system,2),2);assert.equal(a.system.magicCapacity.slots['3'],0);
});
test('manual limits can unlock a circle, never go below zero and control cast validation',async()=>{
 setup();const a=actor(),s=spell(a);s.system.memorized=1;a.items.push(s);
 await a.update(memoryModeUpdate(a.system,true));assert.equal(spellCapacity(a)[0].max,0);await s.cast();assert.equal(s.system.used,0);
 await a.update(memoryStepUpdate(a.system,{circle:1,delta:1}));await s.cast();assert.equal(s.system.used,1);assert.match(messages.at(-1).content,/chat-resource/);assert.match(messages.at(-1).content,/Memorizações restantes/);
 assert.equal(memoryStepUpdate(a.system,{circle:2,delta:-1})['system.magicCapacity.slots.2'],0);assert.equal(memoryStepUpdate(a.system,{circle:7,delta:1}),null);
});
test('spell effect choices preserve unrelated data and remove the chosen automatic effect',()=>{
 setup();const s=spell(actor());s.system.description='Preservar';s.system.effectSave=2;
 const added=spellGroupUpdate(s,'damage');for(const [p,v] of Object.entries(added))setPath(s,p,v);assert.equal(s.system.spellDamage,'1d6');assert.ok(spellGroupEnabled(s,'damage'));
 const removed=spellGroupUpdate(s,'damage');for(const [p,v] of Object.entries(removed))setPath(s,p,v);assert.equal(s.system.spellDamage,'');assert.equal(s.system.effectSave,2);assert.equal(s.system.description,'Preservar');assert.equal(spellGroupUpdate(s,'invalid'),null);
});
test('circle and counter buttons constrain valid preparation and consumed memories',()=>{
 const s={circle:1,preparedCircle:1,memorized:2,used:2};assert.deepEqual(spellStepUpdate(s,{path:'system.circle',value:'4'}),{'system.circle':4,'system.preparedCircle':4});assert.deepEqual(spellStepUpdate(s,{path:'system.memorized',delta:-1}),{'system.memorized':1,'system.used':1});assert.deepEqual(spellStepUpdate(s,{path:'system.used',delta:1}),{'system.used':2});assert.equal(spellStepUpdate(s,{path:'system.description',value:3}),null);
});
test('spell editor exposes only selected effects and each editable field appears once per step',()=>{
 setup();const s=spell(actor());s.system.spellDamage='1d6+1';
 for(const spellTab of ['basic','effects','description']){const html=itemView(s,{spellTab}),names=[...html.matchAll(/name="([^"]+)"/g)].map(m=>m[1]);assert.equal(names.length,new Set(names).size);assert.match(html,/spell-editor-tabs/);assert.equal(html.includes('name="system.spellDamage"'),spellTab==='effects');assert.ok(!html.includes('name="system.spellHealing"'));assert.equal(html.includes('name="system.description"'),spellTab==='description');}
});
test('native item actions save effect choices and formulas while read-only sheets only navigate',async()=>{
 setup();const s=spell(actor()),sheet=new D20AgeItemSheet(s);await sheet._onClickAction(null,{dataset:{action:'spell-group',group:'healing'}});assert.equal(s.system.spellHealing,'1d6');
 await sheet._onClickAction(null,{dataset:{action:'spell-formula',path:'system.spellHealing',formula:'2d6'}});assert.equal(s.system.spellHealing,'2d6');sheet.isEditable=false;await sheet._onClickAction(null,{dataset:{action:'spell-group',group:'healing'}});assert.equal(s.system.spellHealing,'2d6');await sheet._onClickAction(null,{dataset:{action:'spell-tab',tab:'description'}});assert.equal(sheet._spellTab,'description');
});
test('sheet capacity actions persist, and native adventure section preserves existing notes',async()=>{
 setup();const a=actor(),sheet=new D20AgeActorSheet(a);a.system.adventureNotes='Uma pista';await sheet.handleAction({dataset:{action:'memory-mode',manual:'true'}});await sheet.handleAction({dataset:{action:'memory-step',circle:'3',delta:'1'}});assert.equal(memoryLimit(a.system,3),1);await sheet.handleAction({dataset:{action:'section',section:'adventure'}});assert.equal(sheet._section,'adventure');assert.equal(a.system.adventureNotes,'Uma pista');
});
test('both compositions keep initiative under the portrait on every section and a distinct adventure tab',()=>{
 setup();const a=actor();a.system.adventureNotes='<script>x</script>';
 for(const style of ['standard','ink'])for(const tab of ['attributes','equipment','abilities','magic','notes','adventure','adjustments']){const html=actorView(a,{style,tab});assert.equal((html.match(/data-action="initiative-individual"/g)??[]).length,1);assert.ok(html.indexOf('portrait-initiative')>html.indexOf('portrait-button'));assert.equal(html.includes('name="system.adventureNotes"'),tab==='adventure');assert.ok(!html.includes('<script>'));if(tab==='attributes')assert.ok(!html.match(/advancement-panel[\s\S]*data-action="initiative-/));}
});

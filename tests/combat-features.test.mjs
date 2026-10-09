import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,setPath,diceQueue,messages,callbacks} from './foundry-stub.mjs';
import {D20AgeActorData,D20AgeItemData} from '../scripts/models.mjs';
import {D20AgeActor,D20AgeItem} from '../scripts/documents.mjs';
import {D20AgeActorSheet} from '../scripts/sheets.mjs';
import {hitDiceFormula,hpGain,healthAfter,advanceLevel,reduceLevel,rollCreatureHP} from '../scripts/health.mjs';
import {spellFormula,spellEffectData,rollSpell,applySpellResult} from '../scripts/spell-mechanics.mjs';
import {rollInitiative} from '../scripts/initiative.mjs';
import {roundTokenPath,prepareDefaultToken,migrateRoundTokens,registerCreatureTokenRolls} from '../scripts/tokens.mjs';
import {loadCategory,deriveActor} from '../scripts/rules.mjs';
import {EncounterPanel,creatureSnapshot,encounterView,encounterRecord} from '../scripts/encounter-panel.mjs';
import {spellMechanicsUpdate,migrateWorldSpellMechanics} from '../scripts/mechanics-migration.mjs';
import {defaultLanguages,LANGUAGE_TABLE,ALIGNMENTS} from '../scripts/languages.mjs';
import {GeneratorController} from '../scripts/generator-controller.mjs';
import {buildCharacter,initialDraft} from '../scripts/generation.mjs';
import {actorView,itemView} from '../scripts/view.mjs';
const load=name=>JSON.parse(readFileSync(new URL(`../content/${name}.json`,import.meta.url),'utf8'));
function setup(){
 globalThis.game={user:{id:'gm',isGM:true,targets:new Set()},users:[{id:'gm',isGM:true}],settings:{get(){return undefined;}},time:{worldTime:100},journal:[],actors:[],items:[],scenes:[]};
 game.users.activeGM=game.users[0];globalThis.canvas={tokens:{controlled:[]}};
 foundry.applications.api.DialogV2.confirm=async()=>true;foundry.applications.api.DialogV2.prompt=async()=>null;
 foundry.utils={randomID:()=>Math.random().toString(36).slice(2)};
 diceQueue.length=0;messages.length=0;
}
function actor(type='character'){const a=new D20AgeActor({type,system:defaults(D20AgeActorData)});a.uuid='Actor.a';a.flags={d20age:{}};a.prepareDerivedData();return a;}
function spell(name='Flecha mágica'){const source=load('spells').find(s=>s.name===name);const item=new D20AgeItem({type:'spell',name,system:{...defaults(D20AgeItemData),...source.system}});item.actor=actor();item.uuid='Actor.a.Item.spell';return item;}
test('DV parser ignores power stars, preserves fixed bonuses, and rejects contextual HD',()=>{
 for(const [raw,formula] of [['½','1d4'],['1/2*','1d4'],['2+2**','2d8+2'],['1-1','1d8-1'],['6+3*','6d8+3'],['12**','12d8'],['3d6+1','3d6+1']])assert.equal(hitDiceFormula(raw),formula);
 assert.throws(()=>hitDiceFormula('2 por cada 10 PV'),/DV especial/);assert.throws(()=>hitDiceFormula('0'),/DV especial/);
 assert.equal(hpGain(1,-3,'fighter'),1);assert.equal(hpGain(5,1,'dwarf'),7);
});
test('HP pools absorb temporary HP, allow negative life and cap healing',()=>{
 assert.deepEqual(healthAfter({value:3,max:10,temp:4},6,'damage'),{value:1,temp:0});
 assert.deepEqual(healthAfter({value:1,max:10},5,'damage'),{value:-4,temp:0});
 assert.deepEqual(healthAfter({value:7,max:10},20,'heal'),{value:10,temp:0});
 assert.deepEqual(healthAfter({value:7,max:10,temp:5},3,'temporary'),{value:7,temp:5});assert.throws(()=>healthAfter({value:1,max:5},-1,'damage'));
});
test('load category boundaries count quantity, carried state, coins and extra mass',()=>{
 assert.deepEqual([0,400,401,800,801,1600,1601,2400,2401].map(n=>loadCategory(n)),['Leve','Leve','Média','Média','Pesada','Pesada','Sobrecarga','Sobrecarga','Acima da capacidade']);
 const a=actor();a.system.coins.gp=50;a.system.extraWeight=1;const item={type:'equipment',system:{carried:true,weight:100,quantity:4}};
 const d=deriveActor('character',a.system,[item,{type:'equipment',system:{carried:false,weight:999,quantity:1}}]);assert.equal(d.weight,451);assert.equal(d.itemWeight,400);assert.equal(d.coinWeight,50);assert.equal(d.move.category,'Média');assert.equal(d.move.value,30);assert.equal(loadCategory(801,800),'Acima da capacidade');
});
test('negative XP adjustment is independent from official Wisdom bonus',()=>{
 const a=actor();a.system.attributes.wis.value=16;a.system.xpAdjustment=-15;a.prepareDerivedData();assert.equal(a.system.derived.xpBaseBonus,10);assert.equal(a.system.derived.xpBonus,-5);
});
test('advancement rolls once per level, records CON/robustness, preserves wounds and minimum one',async()=>{
 setup();const a=actor();a.system.classId='dwarf';a.system.attributes.con.value=13;a.system.hp={value:3,max:8,temp:2};diceQueue.push(5,2);
 await advanceLevel(a,3);assert.equal(a.system.hp.max,19);assert.equal(a.system.hp.value,14);assert.equal(a.system.hp.temp,2);assert.equal(a.flags.d20age.hpHistory.length,3);
 assert.deepEqual(a.flags.d20age.hpHistory.slice(1).map(h=>h.gain),[7,4]);assert.deepEqual(messages.map(m=>m.formula),['1d8','1d8']);
});
test('cancelled advancement and owner rejection leave all data untouched',async()=>{
 setup();const a=actor();foundry.applications.api.DialogV2.confirm=async()=>false;assert.equal(await advanceLevel(a,2),false);assert.equal(a.system.level,1);assert.equal(a.flags.d20age.hpHistory,undefined);
 a.isOwner=false;await assert.rejects(advanceLevel(a,2),/proprietário/);
});
test('changing the sheet level prompts DV and restoring a corrected level reuses history',async()=>{
 setup();const a=actor();a.system.hp={value:5,max:5,temp:0};diceQueue.push(4);const sheet=new D20AgeActorSheet(a);
 await D20AgeActorSheet.onSubmit.call(sheet,null,null,{object:{'system.level':2}});assert.equal(a.system.hp.max,9);assert.equal(a.flags.d20age.hpHistory.at(-1).die,4);
 await reduceLevel(a,1);assert.equal(a.system.hp.max,5);await advanceLevel(a,2);assert.equal(a.system.hp.max,9);assert.equal(messages.length,1);
});
test('creature HP rolled independently, replaces life, and does not share another creature pool',async()=>{
 setup();const a=actor('creature'),b=actor('creature');a.system.hitDice=b.system.hitDice='2+2*';diceQueue.push(3,14);
 await rollCreatureHP(a,{confirm:false});await rollCreatureHP(b,{confirm:false});assert.equal(a.flags.d20age.hpRolled.formula,'2d8+2');assert.notEqual(a.system.hp.max,b.system.hp.max);assert.deepEqual(messages[0].whisper,['gm']);
 a.isOwner=false;await assert.rejects(rollCreatureHP(a),/criatura/);
});
test('awaitable Actor precreation rolls world creatures but not compendium templates or fixed HP rules',async()=>{
 setup();Actor.prototype._preCreate=async()=>undefined;const a=actor('creature');a.updateSource=data=>{for(const [key,value] of Object.entries(data))setPath(a,key,value);};diceQueue.push(6);await a._preCreate({}, {},game.user);assert.equal(a.system.hp.max,6);
 const b=actor('creature');await b._preCreate({}, {pack:'world.test'},game.user);assert.equal(b.system.hp.max,1);b.system.rollHPOnCreate=false;await b._preCreate({}, {},game.user);assert.equal(b.system.hp.max,1);
});
test('unlinked token creation rolls only on the creating owner, with fixed and linked exceptions',async()=>{
 setup();registerCreatureTokenRolls();let calls=0;const a=actor('creature');a.rollHitPoints=async()=>{calls++;};
 callbacks.createToken({actor:a,actorLink:false},{},'other');callbacks.createToken({actor:a,actorLink:true},{},'gm');assert.equal(calls,0);
 callbacks.createToken({actor:a,actorLink:false},{},'gm');assert.equal(calls,1);a.system.rollHPOnCreate=false;callbacks.createToken({actor:a,actorLink:false},{},'gm');assert.equal(calls,1);
});
test('book templates use rolled DV except hydra heads and colony special formula',()=>{
 for(const a of load('bestiary')){if(a.name.startsWith('Hidra')){assert.equal(a.system.rollHPOnCreate,false);assert.equal(a.system.hp.max,Number(a.system.hitDice.replace('*',''))*8);}else if(a.name.startsWith('Morcego comum (colônia'))assert.equal(a.system.rollHPOnCreate,false);else{assert.equal(a.system.rollHPOnCreate,true);assert.doesNotThrow(()=>hitDiceFormula(a.system.hpFormula||a.system.hitDice));assert.equal(a.system.hp.max,1);}}
 assert.equal(load('bestiary').find(a=>a.name.startsWith('Rato comum (colônia')).system.hpFormula,'1d6+4');
});
test('spell fields match requested UI and every book spell has its own target',()=>{
 for(const s of load('spells')){const item={...s,system:{...defaults(D20AgeItemData),...s.system}},html=['basic','effects','description'].map(spellTab=>itemView(item,{spellTab})).join('');assert.ok(s.system.target,s.name);assert.ok(html.includes('name="system.target"'));assert.ok(!html.includes('name="system.save"'));assert.ok(!html.includes('name="system.properties"'));assert.ok(!html.includes('posição'));assert.equal(html.includes('name="system.spellDamage"'),!!item.system.spellDamage);}
});
test('spell formulas scale missile count, fireball dice, prepared-circle restoration and armor temporary HP',()=>{
 const arrow=spell();arrow.actor.system.level=5;assert.equal(spellFormula(arrow,'damage'),'1d6+1');const fire=spell('Bola de fogo');fire.actor.system.level=7;assert.equal(spellFormula(fire,'damage'),'7d6');const cure=spell('Restauração');cure.system.preparedCircle=3;assert.equal(spellFormula(cure,'healing'),'3d6+3');const armor=spell('Armadura mágica');armor.actor.system.level=4;assert.equal(spellFormula(armor,'temporary'),'4d4');
});
test('native effect changes are reversible, armor uses descending CA and all five SV receive bonus',()=>{
 setup();const ward=spell('Proteção contra o mal');const effect=spellEffectData(ward);assert.equal(effect.changes.find(c=>c.key==='system.combat.acAdjustment').value,'-1');assert.equal(effect.changes.filter(c=>c.key.startsWith('system.saves.')).length,5);assert.equal(effect.flags.d20age.condition,ward.system.effectCondition);assert.equal(effect.origin,ward.uuid);
 const hero=spell('Heroísmo');assert.equal(spellEffectData(hero).changes.find(c=>c.key==='system.combat.damageBonus').value,'1');assert.throws(()=>spellEffectData(spell('Luz')),/Configure/);
});
test('spell damage/healing application requires confirmation, permissions and explicit target',async()=>{
 setup();const item=spell(),target=actor();target.uuid='Actor.target';target.system.hp={value:8,max:10,temp:2};game.user.targets=new Set([{actor:target}]);
 foundry.applications.api.DialogV2.prompt=async()=>5;await applySpellResult(item,'damage',5);assert.equal(target.system.hp.value,5);assert.equal(target.system.hp.temp,0);
 foundry.applications.api.DialogV2.prompt=async()=>99;await applySpellResult(item,'healing',99);assert.equal(target.system.hp.value,10);
 foundry.applications.api.DialogV2.prompt=async()=>null;await applySpellResult(item,'damage',3);assert.equal(target.system.hp.value,10);
 target.isOwner=false;await applySpellResult(item,'damage',3);assert.equal(target.system.hp.value,10);
 game.user.targets.clear();diceQueue.push(4);await rollSpell(item,'damage');assert.equal(item._lastSpellResult.amount,4);assert.equal(messages.at(-1).formula,'1d6+1');
});
test('spell adjustments create native ActiveEffects only for writable targets',async()=>{
 setup();const item=spell('Heroísmo'),target=actor();let created=[];target.createEmbeddedDocuments=async(type,data)=>{assert.equal(type,'ActiveEffect');created=data;};game.user.targets=new Set([{actor:target}]);foundry.applications.api.DialogV2.prompt=async()=>true;await applySpellResult(item,'effect');assert.equal(created.length,1);
});
test('individual initiative updates actor combatant and group initiative uses one shared roll',async()=>{
 setup();const a=actor();let updates=[];game.combat={combatants:[{id:'c1',actor:a,isOwner:true,tokenId:'t1'},{id:'c2',actor:{uuid:'Actor.b'},isOwner:true,tokenId:'t2'}],setInitiative:async(id,value)=>updates.push([id,value])};
 diceQueue.push(3);await rollInitiative({actor:a});assert.deepEqual(updates,[['c1',3]]);updates=[];canvas.tokens.controlled=[{id:'t1'},{id:'t2'}];diceQueue.push(5);await rollInitiative({group:true});assert.deepEqual(updates,[['c1',5],['c2',5]]);
 game.combat.combatants[1].isOwner=false;game.user.isGM=false;await assert.rejects(rollInitiative({group:true}),/editar/);
});
test('selected group initiative requests tokens before creating or changing combat',async()=>{
 setup();await assert.rejects(rollInitiative({group:true}),/Selecione/);assert.equal(game.combat,undefined);game.combat={combatants:[]};await assert.rejects(rollInitiative({group:true}),/Selecione/);
});
test('round default tokens preserve the source image and custom textures',async()=>{
 setup();assert.equal(roundTokenPath('systems/d20age/assets/classes/fighter.png'),'systems/d20age/assets/tokens/fighter.svg');assert.equal(roundTokenPath('worlds/custom.png'),null);
 const a=actor();a.updateSource=data=>{a.patch=data;};prepareDefaultToken(a,{img:'systems/d20age/assets/classes/fighter.png',prototypeToken:{texture:{src:'worlds/custom-token.png'}}});assert.equal(a.patch['prototypeToken.texture.src'],undefined);
 a.img='systems/d20age/assets/classes/fighter.png';a.prototypeToken={texture:{src:a.img}};game.actors=[a];await migrateRoundTokens();assert.equal(a.prototypeToken.texture.src,'systems/d20age/assets/tokens/fighter.svg');
 const svg=readFileSync(new URL('../assets/tokens/fighter.svg',import.meta.url),'utf8');assert.match(svg,/<clipPath/);assert.match(svg,/data:image\/png;base64/);
});
test('language table, racial defaults and alignment options follow LB anchors',()=>{
 assert.equal(LANGUAGE_TABLE.length,20);assert.equal(LANGUAGE_TABLE[1],'Alinhamento');assert.deepEqual(defaultLanguages('elf'),['Comum','Élfico']);assert.deepEqual(defaultLanguages('dwarf'),['Comum','Anão']);assert.deepEqual(defaultLanguages('gnome'),['Comum','Gnomo']);assert.deepEqual(Object.keys(ALIGNMENTS).filter(Boolean),['Ordem','Neutralidade','Caos']);
});
test('generator language selection and d20 sorting do not duplicate defaults or lose earlier choices',async()=>{
 setup();const c=new GeneratorController({equipment:load('equipment'),spells:load('spells')},{roll:async()=>8});await c.act('random-language');assert.deepEqual(c.draft.chosenLanguages,['Élfico']);await c.act('random-language');assert.deepEqual(c.draft.chosenLanguages,['Élfico']);
 c.change({dataset:{language:'Gnomo'},checked:true});assert.deepEqual(c.draft.chosenLanguages,['Élfico','Gnomo']);c.change({dataset:{language:'Élfico'},checked:false});assert.deepEqual(c.draft.chosenLanguages,['Gnomo']);
});
test('generated characters include initial HP ledger, alignment, native defaults and adventure notes',()=>{
 const content={equipment:load('equipment'),spells:load('spells')},d=initialDraft();Object.assign(d,{method:'manual',values:{str:10,int:12,wis:10,dex:10,con:13,cha:10},specialization:'Espada longa',hpDie:4,goldRoll:10,name:'Teste',chosenLanguages:['Silvano','Alinhamento'],alignment:'Ordem',notes:'Uma pista no castelo.'});
 const {data}=buildCharacter(d,content);assert.equal(data.system.alignment,'Ordem');assert.equal(data.system.languages,'Comum, Silvano, Alinhamento (Ordem)');assert.equal(data.flags.d20age.hpHistory[0].gain,5);assert.equal(data.system.adventureNotes,d.notes);
});
test('mechanics migration seeds new spell fields once while preserving custom formulas and prose',()=>{
 const source=load('spells').find(s=>s.name==='Flecha mágica'),old={type:'spell',system:{description:'Texto do mestre',spellDamage:'2d6',target:'Meu alvo'},flags:{}};const patch=spellMechanicsUpdate(old,source);assert.equal(patch['system.spellDamage'],undefined);assert.equal(patch['system.target'],undefined);assert.equal(patch['system.description'],undefined);assert.equal(patch['system.spellScaling'],'missiles');old.flags={d20age:{mechanicsRevision:'0.5.0'}};assert.equal(spellMechanicsUpdate(old,source),null);
});
test('world migration preserves creature HP and custom non-book items',async()=>{
 setup();const a=actor('creature');a.system.hp={value:17,max:24,temp:0};const book=spell();book.flags={d20age:{source:'d20age RPG - LB (V2)'}};book.system.spellDamage='';book.system.target='';book.id='book';book.actor=a;a.items.push(book);game.actors=[a];const custom=spell();custom.flags={};custom.system.spellDamage='';game.items=[custom];await migrateWorldSpellMechanics(load('spells'));assert.equal(book.system.spellDamage,'1d6+1');assert.equal(custom.system.spellDamage,'');assert.equal(a.system.hp.value,17);assert.equal(a.system.hp.max,24);
});
test('creature panel snapshots keep numbered independent exemplars without changing the original',()=>{
 setup();const a=actor('creature');const first=creatureSnapshot(a,[]),second=creatureSnapshot(a,[first]);assert.equal(first.name,'Aventureiro 1');assert.equal(second.name,'Aventureiro 2');first.hp.value=9;assert.equal(second.hp.value,0);assert.equal(a.system.hp.value,1);assert.throws(()=>creatureSnapshot(actor()),/criatura/);
 const html=encounterView([{...first,rolled:true,initialHP:9,notes:'<script>x</script>'}]);assert.match(html,/data-action="damage"/);assert.match(html,/data-action="heal"/);assert.ok(!html.includes('<script>'));
});
test('encounter record is private, persists HP and denies every player entry path',async()=>{
 setup();let created;globalThis.JournalEntry={create:async data=>{created=data;return {...data,update:async()=>{}};}};await encounterRecord();assert.equal(created.ownership.default,0);game.user.isGM=false;await assert.rejects(encounterRecord(),/exclusivo/);const panel=new EncounterPanel({});assert.throws(()=>panel.rows(),/exclusivo/);await assert.rejects(panel.act({dataset:{action:'clear'}}),/exclusivo/);
});
test('panel addition rolls separate HP and damage/cure affect only one saved row',async()=>{
 setup();const panel=new EncounterPanel({});let stored=[];panel.record={flags:{d20age:{encounterRows:stored}},async update(data){stored=data['flags.d20age.encounterRows'];this.flags.d20age.encounterRows=stored;}};panel.render=async()=>panel;const a=actor('creature');diceQueue.push(3,7);await panel.add(a);await panel.add(a);assert.deepEqual(stored.map(r=>r.hp.value),[3,7]);
 await panel.act({dataset:{action:'damage',id:stored[0].id},closest:()=>({querySelector:()=>({value:'5'})})});assert.deepEqual(stored.map(r=>r.hp.value),[-2,7]);await panel.act({dataset:{action:'heal',id:stored[0].id},closest:()=>({querySelector:()=>({value:'99'})})});assert.deepEqual(stored.map(r=>r.hp.value),[3,7]);assert.equal(a.system.hp.value,1);
});
test('editing the damage amount does not rerender the panel before the action reads it',async()=>{
 setup();const panel=new EncounterPanel({});panel.record={flags:{d20age:{encounterRows:[{id:'row',hp:{value:8,max:8}}]}}};let saves=0;panel.save=async()=>{saves++;};await panel.change({dataset:{},value:'3',closest:()=>({dataset:{row:'row'}})});assert.equal(saves,0);
});
test('both sheet styles show load, HP ledger and dedicated adventure notes without duplicate named fields',()=>{
 const a=actor();for(const style of ['standard','ink'])for(const tab of ['attributes','equipment','notes','adventure','magic']){const html=actorView(a,{style,tab}),names=[...html.matchAll(/name="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(names).size,names.length);assert.match(html,/data-action="initiative-individual"/);if(tab==='attributes')assert.match(html,/Registro de PV por nível/);if(tab==='equipment'){assert.match(html,/Carga da jornada/);assert.match(html,/Equipamentos/);}if(tab==='adventure')assert.match(html,/name="system.adventureNotes"/);if(tab==='notes')assert.ok(!html.includes('name="system.adventureNotes"'));if(tab==='magic')assert.ok(!html.includes('posições'));}
});

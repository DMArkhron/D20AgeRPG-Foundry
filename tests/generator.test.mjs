import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CLASSES,ATTRIBUTES} from '../scripts/rules.mjs';
import {initialDraft,buildCharacter,stepErrors,assignedAttributes,cartSummary,setClass,trained} from '../scripts/generation.mjs';
import {GeneratorController} from '../scripts/generator-controller.mjs';
import {generatorView} from '../scripts/generator-view.mjs';
const content=Object.fromEntries(['equipment','spells'].map(n=>[n,JSON.parse(readFileSync(new URL(`../content/${n}.json`,import.meta.url)))]));
const equipment=name=>content.equipment.find(i=>i.name===name);
const valid=(classId='fighter')=>({...initialDraft(),classId,name:'Aventureiro',values:{str:13,int:16,wis:9,dex:12,con:14,cha:8},hpDie:1,goldRoll:12,ancestry:0,skill:'Acurácia',specialization:'Espada longa',spellId:content.spells.find(s=>s.system.circle===1)._id,hiddenSpell:'Luz'});
test('all seven classes build coherent level-one characters, proper spell/hidden slots and illustrated portraits',()=>{
 for(const classId of Object.keys(CLASSES)){
  const {data,derived}=buildCharacter(valid(classId),content,{userId:'player'});
  assert.equal(data.type,'character');assert.equal(data.system.level,1);assert.equal(data.system.alignment,'');assert.equal(data.system.xp,0);assert.equal(data.system.hp.max,classId==='dwarf'?3:2);assert.equal(data.system.coins.gp,120);assert.equal(derived.thac0,CLASSES[classId].thac0[0]);assert.equal(data.ownership.player,3);
  assert(existsSync(new URL('../'+data.img.replace('systems/d20age/',''),import.meta.url)));
  assert.equal(data.items.filter(i=>i.type==='spell').length,['elf','arcanist'].includes(classId)?1:0);
  if(['elf','arcanist'].includes(classId))assert.equal(data.items.find(i=>i.type==='spell').system.memorized,1);
  if(classId==='magist'){assert.equal(data.system.hiddenSpell,'Luz');assert.equal(derived.progression.slots[0],0);assert.equal(derived.progression.hidden,1)}
  assert(data.items.every(i=>!i._id&&!i.folder));
 }
});
test('distributed scores use each die once, swapping choices preserves even repeated roll values',()=>{
 const ctrl=new GeneratorController(content);const d=ctrl.draft;d.method='distributed';d.pool=[9,9,10,11,12,13];d.assignments={str:0,int:1,wis:2,dex:3,con:4,cha:5};
 ctrl.change({dataset:{assignment:'str'},value:'5'});assert.equal(assignedAttributes(d).str,13);assert.equal(assignedAttributes(d).cha,9);
 d.assignments.cha=5;assert.equal(assignedAttributes(d),null);assert(stepErrors(d,content,1).length);
});
test('character generation refuses missing choices, invalid rolls, negative quantities and over-budget purchases',()=>{
 const d=valid();d.values.con=19;assert.throws(()=>buildCharacter(d,content),/3 e 18/);d.values.con=14;d.hpDie=9;assert.throws(()=>buildCharacter(d,content),/vida/);d.hpDie=1;
 d.cart[equipment('Couraça')._id]=1;assert.throws(()=>buildCharacter(d,content),/ultrapassam/);
 d.cart[equipment('Couraça')._id]=-1;assert.throws(()=>buildCharacter(d,content),/Compra inválida/);
 const specialist=valid('specialist');specialist.skill='Arma';specialist.skillWeapon='Montante';assert.throws(()=>buildCharacter(specialist,content),/arma treinada/);
 const magist=valid('magist');magist.hiddenSpell='Sono';assert.throws(()=>buildCharacter(magist,content),/oculta/);
});
test('purchases use integer copper arithmetic, equipment quantities and minimum life; specialization applies once',()=>{
 const d=valid();d.values.con=3;d.resourceMethod='manual';d.manualGold=20.51;const herb=content.equipment.find(i=>i.system.price===0.1);assert(herb);
 for(const [name,n] of [['Espada longa',1],['Couro simples',1],[herb.name,2]])d.cart[equipment(name)._id]=n;
 d.equipped[equipment('Couro simples')._id]=true;
 const before=structuredClone(content);const {data,derived}=buildCharacter(d,content);assert.equal(data.system.hp.max,1);assert.deepEqual(data.system.coins,{gp:0,sp:3,cp:1,ep:0,pp:0});assert.equal(data.items.find(i=>i.name==='Espada longa').system.damageBonus,1);assert.equal(derived.ac,8);assert.deepEqual(content,before);
});
test('gnome adapted armor, quick feet and dwarf stone skin are reflected in preview and actual data',()=>{
 const g=valid('gnome');g.ancestry=3;const armor=equipment('Couro simples');const shield=equipment('Escudo');g.cart={[armor._id]:1,[shield._id]:1};g.equipped={[armor._id]:true,[shield._id]:true};
 const result=buildCharacter(g,content);assert.equal(result.data.items.find(i=>i.name===armor.name).system.weight,50);assert.equal(result.data.items.find(i=>i.name==='Escudo').system.weight,50);assert.equal(result.derived.ac,6);assert.equal(result.derived.move.value,40);assert.equal(result.data.system.movement.auto,false);
 const dwarf=buildCharacter(valid('dwarf'),content);assert.equal(dwarf.derived.ac,8);assert(dwarf.data.items.some(i=>i.name==='Ancestralidade'));
});
test('class changes reset incompatible choices and hit die without losing attributes or purchased gear',()=>{
 const d=valid();d.cart[equipment('Adaga')._id]=2;setClass(d,'arcanist');assert.equal(d.hpDie,null);assert.equal(d.specialization,'');assert.equal(d.values.str,13);assert.equal(d.cart[equipment('Adaga')._id],2);assert.equal(trained('arcanist',equipment('Couraça')),false);
});
test('six-step navigation preserves draft, validates skipped stages and commits only once at the end',async()=>{
 const queue=[13,16,9,12,14,8,4,12];const formulas=[];let committed=0;
 const ctrl=new GeneratorController(content,{roll:async f=>{formulas.push(f);return queue.shift()},finish:async()=>{committed++;return true}});
 await ctrl.act('step',{step:5});assert.equal(ctrl.draft.step,1);assert.match(ctrl.error,/atributos/);assert.equal(committed,0);
 await ctrl.act('roll-attributes');await ctrl.act('next');assert.equal(ctrl.draft.step,2);
 ctrl.change({dataset:{field:'specialization'},value:'Espada longa'});await ctrl.act('next');await ctrl.act('roll-hp');await ctrl.act('roll-gold');await ctrl.act('next');await ctrl.act('starter-kit');await ctrl.act('back');assert.equal(ctrl.draft.step,3);await ctrl.act('next');assert.equal(Object.keys(ctrl.draft.cart).length,6);await ctrl.act('next');ctrl.change({dataset:{field:'name'},value:'Dama da Estrada'});assert.equal(committed,0);await ctrl.act('finish');assert.equal(committed,1);assert.deepEqual(formulas,['3d6','3d6','3d6','3d6','3d6','3d6','1d8','3d6']);
});
test('all wizard stages render escaped text, labelled controls and legible illustrated class cards',()=>{
 const d=valid('elf');d.name='<script>alert(1)</script>';d.notes='<img src=x onerror=alert(1)>';
 for(let step=0;step<6;step++){d.step=step;const html=generatorView(d,content);assert.match(html,/generator-progress/);assert.match(html,/generator-footer/);assert.doesNotMatch(html,/<script>|<img[^>]*onerror=/);if(step===0)assert.equal((html.match(/class="class-card /g)??[]).length,7)}
});

import {test} from "node:test";
import assert from "node:assert/strict";
import {defaults} from "./foundry-stub.mjs";
import {D20AgeActorData,D20AgeItemData} from "../scripts/models.mjs";
import {modifier,progression,movement,attackResult,deriveActor,CLASSES} from "../scripts/rules.mjs";
import {actorView,spellCapacity,escapeHTML} from "../scripts/view.mjs";
const actor = () => defaults(D20AgeActorData);
const item = (type,system={}) => ({type,system:{...defaults(D20AgeItemData),...system}});
test("atributos: cada valor de 3 a 18 segue a tabela",()=>{
  assert.deepEqual(Array.from({length:16},(_,i)=>modifier(i+3)),[-3,-2,-2,-1,-1,-1,0,0,0,0,1,1,1,2,2,3]);
});
test("sete progressões e valores irregulares preservados",()=>{
  assert.equal(Object.keys(CLASSES).length,7);
  for(const id of Object.keys(CLASSES)){for(let level=1;level<=10;level++){const p=progression(id,level);assert.equal(Object.keys(p.saves).length,5);assert.ok(p.thac0>=9&&p.thac0<=19);if(level<10)assert.ok(p.nextXp>p.xp);else assert.equal(p.nextXp,null);}}
  assert.equal(progression("magist",6).xp,35000);
  assert.deepEqual(Object.values(progression("magist",10).saves),[7,8,10,12,11]);
  assert.equal(progression("dwarf",5).xp,17000);
  assert.deepEqual(progression("magist",1).slots,[0,0,0]);
  assert.equal(progression("magist",1).hidden,1);
  assert.equal(progression("elf",10).xp,600000);
});
test("TAC0 e BA são equivalentes para todas as progressões e defesas",()=>{
  for(const id of Object.keys(CLASSES))for(let lv=1;lv<=10;lv++)for(let ac=-5;ac<=9;ac++)for(let natural=2;natural<20;natural++){
    const thac0=progression(id,lv).thac0, bonus=2;
    assert.equal(attackResult({natural,total:natural+bonus,thac0,ac}).hit,natural+bonus+(19-thac0)>=19-ac);
  }
  assert.equal(attackResult({natural:1,total:99,thac0:9,ac:9}).hit,false);
  assert.equal(attackResult({natural:20,total:-50,thac0:19,ac:-5}).hit,true);
  assert.equal(attackResult({natural:12,total:13,thac0:18}).hit,null);
});
test("fronteiras de carga, anão, gnomo e fadiga",()=>{
  assert.deepEqual([400,401,800,801,1600,1601,2400,2401].map(w=>movement(w,"fighter",40).value),[40,30,30,20,20,10,10,0]);
  assert.equal(movement(1600,"dwarf",30).value,30);
  assert.equal(movement(1601,"dwarf",30).value,10);
  assert.equal(movement(800,"gnome",30).value,30);
  assert.equal(movement(801,"gnome",30).overCapacity,true);
  assert.equal(movement(0,"fighter",40,true).value,30);
});
test("proteção não usa DES e não acumula dois escudos",()=>{
  const s=actor();s.attributes.dex.value=18;s.attributes.wis.value=16;
  const d=deriveActor("character",s,[item("armor",{ac:7,equipped:true}),item("armor",{ac:3,equipped:true}),item("armor",{shield:true,equipped:true}),item("armor",{shield:true,equipped:true})]);
  assert.equal(d.ac,2);assert.equal(d.attackBonus,3);assert.equal(d.saves.spell.bonus,2);assert.equal(d.xpBonus,10);
  s.combat.autoArmor=false;s.combat.ac=-2;s.combat.acAdjustment=-1;
  assert.equal(deriveActor("character",s,[]).ac,-3);
});
test("itens fora da carga e quantidade zero não afetam peso/CA",()=>{
  const s=actor();s.coins.gp=100;s.extraWeight=20;
  const d=deriveActor("character",s,[item("equipment",{weight:100,quantity:3}),item("equipment",{weight:2000,carried:false}),item("armor",{ac:-5,equipped:true,quantity:0})]);
  assert.equal(d.weight,420);assert.equal(d.ac,9);assert.equal(d.move.value,30);assert.equal(d.money,100);
});
test("criaturas preservam estatísticas manuais e PV negativos",()=>{
  const s=actor();s.hp.value=-4;s.combat.ac=3;s.combat.thac0=15;s.saves.death.target=9;s.movement.base=20;
  const d=deriveActor("creature",s,[]);
  assert.equal(d.ac,3);assert.equal(d.thac0,15);assert.equal(d.saves.death.target,9);assert.equal(d.move.value,20);assert.ok(d.warnings.length);
  assert.equal(s.hp.value,-4);
});
test("contagem de memorização inclui posições superiores, sem consumir limite diário ao conjurar",()=>{
  const s=actor();s.classId="arcanist";s.level=3;
  const a={type:"character",system:s,items:[item("spell",{preparedCircle:2,memorized:1,used:1})]};
  s.derived=deriveActor(a.type,s,a.items);
  assert.deepEqual(spellCapacity(a)[1],{circle:2,max:1,used:1});
});
test("dados de usuário são escapados em textos e atributos HTML",()=>{
  const s=actor();s.derived=deriveActor("character",s,[]);
  const html=actorView({type:"character",system:s,name:'<script>alert(1)</script>',items:[],img:'x" onerror="alert(1)'},{tab:"notes"});
  assert.ok(!html.includes("<script>"));assert.ok(html.includes("&lt;script&gt;"));assert.ok(html.includes("&quot; onerror=&quot;"));
  assert.equal(escapeHTML("&<>"),"&amp;&lt;&gt;");
});
test("cada seção tem campos únicos para evitar salvamento ambíguo",()=>{
  for(const type of ["character","creature"])for(const tab of ["attributes","equipment","abilities","magic","notes","adjustments"]){
    const s=actor();s.derived=deriveActor(type,s,[]);
    const html=actorView({type,system:s,name:"Teste",items:[]},{tab});
    const names=[...html.matchAll(/<(?:input|select|textarea)\b[^>]*name="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(names.length,new Set(names).size,`${type}: ${tab}`);
  }
});

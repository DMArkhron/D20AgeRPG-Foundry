import {test} from "node:test";
import assert from "node:assert/strict";
import {defaults,diceQueue,messages,warnings,callbacks,registrations} from "./foundry-stub.mjs";
import {D20AgeActorData,D20AgeItemData} from "../scripts/models.mjs";
import {D20AgeActor,D20AgeItem} from "../scripts/documents.mjs";
import {D20AgeActorSheet,D20AgeItemSheet} from "../scripts/sheets.mjs";
import "../scripts/d20age.mjs";
const makeActor=(patch={})=>{const s=defaults(D20AgeActorData);Object.assign(s,patch);const a=new D20AgeActor({system:s});a.prepareDerivedData();return a;};
test("inicialização registra documentos, modelos, fichas e recursos",()=>{
  callbacks.init();
  assert.equal(CONFIG.Actor.documentClass,D20AgeActor);assert.equal(CONFIG.Item.documentClass,D20AgeItem);
  assert.equal(Object.keys(CONFIG.Item.dataModels).length,5);assert.equal(registrations.length,5);
  assert.deepEqual(CONFIG.Actor.trackableAttributes.character.bar,["hp"]);assert.equal(CONFIG.Combat.initiative.formula,"1d6");
});
test("criação não substitui retrato/token importados",()=>{
  const a=makeActor();callbacks.preCreateActor(a,{img:"custom.webp",prototypeToken:{actorLink:false}});assert.ok(!a.lastSource.img);assert.equal(a.lastSource['prototypeToken.actorLink'],false);assert.ok(!a.lastSource['prototypeToken.texture.src']);
  callbacks.preCreateActor(a,{});assert.equal(a.lastSource["prototypeToken.texture.src"],"systems/d20age/assets/tokens/crest.svg");assert.equal(a.lastSource["prototypeToken.actorLink"],true);
});
test("submissão salva apenas pelo documento e respeita modo de leitura",async()=>{
  const a=makeActor();const sheet=new D20AgeActorSheet(a);
  await D20AgeActorSheet.onSubmit.call(sheet,null,null,{object:{"system.hp.value":-2}});assert.equal(a.system.hp.value,-2);
  sheet.isEditable=false;await D20AgeActorSheet.onSubmit.call(sheet,null,null,{object:{"system.hp.value":99}});assert.equal(a.system.hp.value,-2);
  const i=new D20AgeItem({type:"spell",system:defaults(D20AgeItemData)});const is=new D20AgeItemSheet(i);
  await D20AgeItemSheet.onSubmit.call(is,null,null,{object:{"system.used":2,"system.memorized":1}});assert.equal(i.system.used,1);
});
test("SV adiciona SAB uma única vez e não impõe 1/20 automáticos",async()=>{
  const a=makeActor();a.system.attributes.wis.value=16;a.prepareDerivedData();diceQueue.push(14);await a.rollSave("spell");
  assert.equal(messages.at(-1).formula,"1d20 +2");assert.ok(messages.at(-1).flavor.includes("Sucesso"));
  a.system.saves.spell.bonus=30;a.prepareDerivedData();diceQueue.push(1);await a.rollSave("spell");assert.ok(messages.at(-1).flavor.includes("Sucesso"));
});
test("arma compara alvo, reporta CA atingida e rola dano com FOR",async()=>{
  const a=makeActor();a.system.attributes.dex.value=13;a.system.attributes.str.value=16;a.prepareDerivedData();
  const i=new D20AgeItem({system:{...defaults(D20AgeItemData),damage:"1d8"}});i.actor=a;
  const target=makeActor();target.system.combat.autoArmor=false;target.system.combat.ac=5;target.prepareDerivedData();
  game.user.targets=new Set([{actor:target}]);diceQueue.push(12);await i.rollAttack();
  assert.ok(messages.at(-1).flavor.includes("CA atingida 5"));assert.ok(messages.at(-1).flavor.includes("Acerto"));
  diceQueue.push(5);await i.rollDamage();assert.equal(messages.at(-1).formula,"1d8 +2");
  game.user.targets=new Set();
});
test("critical variant doubles dice once and preserves flat damage bonus",async()=>{
  const previousGet=game.settings.get;game.settings.get=(_,key)=>key==='combatRules'?{critical:'doubleDice'}:{};
  try{const a=makeActor();a.system.attributes.str.value=16;a.prepareDerivedData();const i=new D20AgeItem({system:{...defaults(D20AgeItemData),damage:'1d8'}});i.actor=a;game.user.targets=new Set();diceQueue.push(20);await i.rollAttack();await i.rollDamage();assert.equal(messages.at(-1).formula,'2d8 +2');await i.rollDamage();assert.equal(messages.at(-1).formula,'1d8 +2');}finally{game.settings.get=previousGet}
});
test("conjuração consome uma memorização e impede uso além do preparado",async()=>{
  const a=makeActor({classId:"arcanist"});const i=new D20AgeItem({type:"spell",system:{...defaults(D20AgeItemData),memorized:1}});
  a.items.push(i);i.actor=a;a.prepareDerivedData();await i.cast();assert.equal(i.system.used,1);
  const count=messages.length;await i.cast();assert.equal(messages.length,count);assert.ok(warnings.at(-1).includes("disponível"));
});
test("ataque impedido em sobrecarga ou PV zero",async()=>{
  const a=makeActor({extraWeight:1800});const i=new D20AgeItem({system:defaults(D20AgeItemData)});i.actor=a;
  const count=messages.length;await i.rollAttack();assert.equal(messages.length,count);
});
test("geração inicial rola atributos em ordem, PV e moedas",async()=>{
  const a=makeActor();const sheet=new D20AgeActorSheet(a);
  diceQueue.push(13,10,12,14,16,9,5,12);await sheet.generateCharacter();
  assert.equal(a.system.attributes.str.value,13);assert.equal(a.system.attributes.dex.value,14);assert.equal(a.system.attributes.con.value,16);
  assert.equal(a.system.hp.max,7);assert.equal(a.system.coins.gp,120);
});
test("descrições de todos os registros vão ao chat sem consumir recursos",async()=>{
  const actor=makeActor();
  for(const type of ['weapon','armor','equipment','spell','ability']) {
    const system=defaults(D20AgeItemData);Object.assign(system,{description:'Texto <script>malicioso</script>\nSegunda linha',memorized:2,used:1,charges:{value:3,max:4}});
    const item=new D20AgeItem({name:'Nome <b>da mesa</b>',type,system});item.actor=actor;
    const before=structuredClone(item.system);const count=messages.length;
    await item.sendDescription();
    assert.equal(messages.length,count+1);assert.deepEqual(item.system,before);
    const message=messages.at(-1);assert.ok(message.content.includes('d20age-chat-card'));assert.ok(message.content.includes('Segunda linha'));assert.ok(!message.content.includes('<script>'));assert.ok(!message.content.includes('Nome <b>'));assert.equal(message.formula,undefined);
  }
});
test("descrição pode ser compartilhada pela lista e pelo editor sem exigir edição",async()=>{
  const actor=makeActor();const item=new D20AgeItem({type:'ability',system:defaults(D20AgeItemData)});item.actor=actor;actor.items.push(item);
  const sheet=new D20AgeActorSheet(actor);sheet.isEditable=false;actor.isOwner=false;
  await sheet.handleAction({dataset:{action:'item-chat',itemId:item.id}});assert.ok(messages.at(-1).content.includes('Habilidade'));
  const editor=new D20AgeItemSheet(item);editor.isEditable=false;
  await editor._onClickAction(null,{dataset:{action:'item-chat'}});assert.ok(messages.at(-1).content.includes('Habilidade'));
});

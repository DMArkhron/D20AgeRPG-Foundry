import {cargoState,packProfile} from './party-rules.mjs';
import {combatRules} from './preferences.mjs';
import {deriveActor, SAVES, attackResult, signed} from "./rules.mjs";
import {escapeHTML} from "./view.mjs";
import {chatCard} from "./chat.mjs";
import {itemDescriptionCard} from "./descriptions.mjs";
const speakerFor = actor => ChatMessage.getSpeaker({actor});
export class D20AgeActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    if(this.type === "party"){this.system.derived={weight:cargoState(this).weight};return;}
    this.system.derived = deriveActor(this.type, this.system, Array.from(this.items ?? []));
    if(this.type === "creature" && packProfile(this)){const load=cargoState(this);this.system.derived.weight=load.weight;this.system.derived.move=load;this.system.derived.warnings=this.system.derived.warnings.filter(w=>!w.startsWith("Carga acima")&&!w.startsWith("Sobrecarga:"));if(load.overCapacity)this.system.derived.warnings.push("Carga acima da capacidade do animal.");}
  }
  async _preCreate(data,options,user){
    const result=await super._preCreate(data,options,user);
    if(result===false||this.type!=='creature'||options.pack||this.system.rollHPOnCreate===false)return result;
    const {hitDiceFormula}=await import('./health.mjs');
    try{const formula=this.system.hpFormula?.trim()||hitDiceFormula(this.system.hitDice);const roll=await new Roll(formula).evaluate();const hp=Math.max(1,roll.total);this.updateSource({'system.hp.value':hp,'system.hp.max':hp,'system.hp.temp':0,'flags.d20age.hpRolled':{formula,total:hp,at:Date.now()}});}catch(error){ui.notifications.warn(error.message);}
    return result;
  }
  async advanceLevel(target,extra){return (await import('./health.mjs')).advanceLevel(this,target,extra);}
  async rollHitPoints(options){return (await import('./health.mjs')).rollCreatureHP(this,options);}
  getRollData() {
    return {...super.getRollData(),mods:{...this.system.derived.mods},level:this.system.level};
  }
  async rollSave(key) {
    const save = this.system.derived.saves[key];
    if (!save) return;
    const roll = await new Roll(`1d20 ${signed(save.bonus)}`).evaluate();
    await roll.toMessage({speaker:speakerFor(this),flavor:chatCard({type:"save",title:SAVES[key],subtitle:"Salvaguarda",rows:[["Alvo",save.target],["Bônus",signed(save.bonus)]],outcome:roll.total >= save.target ? "Sucesso" : "Falha"})});
    return roll;
  }
  async rollMorale() {
    const roll = await new Roll("2d6").evaluate();
    await roll.toMessage({speaker:speakerFor(this),flavor:chatCard({type:"morale",title:"Teste de moral",rows:[["Moral",this.system.morale]],outcome:roll.total <= this.system.morale ? "Mantém a posição" : "Foge ou se rende; arbitrar"})});
    return roll;
  }
}
export class D20AgeItem extends Item {
  async sendDescription() {
    return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),content:itemDescriptionCard(this)});
  }
  async rollAttack() {
    this._d20ageCritical=false;
    const actor = this.actor;
    if (!actor || this.type !== "weapon") return;
    const d = actor.system.derived;
    if (d.move.overloaded || actor.system.conditions.exhaustion >= 5 || actor.system.hp.value <= 0) {
      ui.notifications.warn("Personagem incapacitado ou em sobrecarga. Resolva a condição antes de atacar.");
      return;
    }
    const targets = Array.from(game.user.targets);
    if (targets.length > 1) return ui.notifications.warn("Selecione um único alvo ou remova os alvos para rolar livremente.");
    const target = targets[0]?.actor;
    const ac = target?.system?.derived?.ac ?? null;
    const bonus = d.attackBonus + this.system.attackBonus;
    const roll = await new Roll(`1d20 ${signed(bonus)}`).evaluate();
    const natural = roll.dice[0].results.find(result => result.active !== false).result;
    const result = attackResult({natural,total:roll.total,thac0:d.thac0,ac,naturalRules:combatRules().naturalRules});
    this._d20ageCritical=natural===20;
    const outcome = result.hit === null ? "Compare à CA do alvo" : result.hit ? "Acerto" : "Erro";
    // Report numeric target defence without leaking the target actor's name.
    await roll.toMessage({speaker:speakerFor(actor),flavor:chatCard({type:"attack",title:this.name,subtitle:"Ataque",rows:[...(combatRules().defense==="ascending" ? [["Bônus de ataque",signed(d.ba)],["Defesa atingida",19-result.reached],...(ac===null?[]:[["CAA do alvo",19-ac]])] : [["TAC0",d.thac0],["CA atingida",result.reached],...(ac===null?[]:[["CA do alvo",ac]])]),["Bônus",signed(bonus)]],outcome,description:this.system.description,footnote:natural===20 ? "20 natural" : natural===1 ? "1 natural" : ""})});
    return roll;
  }
  async rollDamage() {
    if (this.type !== "weapon" || !this.actor) return;
    const s = this.system;
    const strength = s.mode === "melee" || s.strengthDamage ? this.actor.system.derived.mods.str : 0;
    const bonus = s.damageBonus + (this.actor.system.combat.damageBonus??0) + strength - this.actor.system.conditions.exhaustion;
    const critical=this._d20ageCritical&&combatRules().critical==="doubleDice";
    const damage=critical?s.damage.replace(/(\d+)d(\d+)/g,(_,n,faces)=>`${Number(n)*2}d${faces}`):s.damage;
    const formula = `${damage} ${signed(bonus)}`;
    if (!Roll.validate(formula)) return ui.notifications.warn("Fórmula de dano inválida. Edite a arma.");
    const roll = await new Roll(formula,this.actor.getRollData()).evaluate();
    this._d20ageCritical=false;
    await roll.toMessage({speaker:speakerFor(this.actor),flavor:chatCard({type:"damage",title:this.name,subtitle:"Dano",rows:[["Fórmula",formula]],footnote:s.mode==="thrown" ? "Confira o bônus de Força conforme o intervalo de arremesso." : ""})});
    return roll;
  }
  async cast() {
    if (this.type !== "spell" || !this.actor?.isOwner) return;
    if (this.system.used >= this.system.memorized) return ui.notifications.warn("Esta magia não tem uma memorização disponível.");
    if (this.system.preparedCircle < this.system.circle) return ui.notifications.warn("Um espaço inferior não pode receber esta magia.");
    const {spellCapacity} = await import("./view.mjs");
    if (spellCapacity(this.actor).some(slot => slot.used > slot.max)) return ui.notifications.warn("Memorização acima dos espaços de memorização da classe. Ajuste as magias antes de conjurar.");
    const confirm = await foundry.applications.api.DialogV2.confirm({window:{title:"Conjurar magia"},content:`<p>Consumir uma memorização de <b>${escapeHTML(this.name)}</b>? A conjuração normalmente ocupa ação e movimento.</p>`});
    if (!confirm) return;
    await this.update({"system.used":this.system.used+1});
    await ChatMessage.create({speaker:speakerFor(this.actor),content:chatCard({type:"spell",title:this.name,subtitle:"Conjuração",description:this.system.description,rows:[["Círculo",this.system.preparedCircle],["Alcance",this.system.range||"Consultar"],["Duração",this.system.duration||"Consultar"],["Alvo",this.system.target||"Consultar descrição"]],resource:{label:'Memorizações restantes',value:this.system.memorized-this.system.used}})});
  }
}

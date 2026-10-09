import {advanceLevel,reduceLevel,rollCreatureHP} from './health.mjs';
import {rollSpell,applySpellResult} from './spell-mechanics.mjs';
import {rollInitiative} from './initiative.mjs';
import {memoryModeUpdate,memoryStepUpdate} from './memorization.mjs';
import {spellGroupUpdate,spellStepUpdate} from './spell-editor.mjs';
import {normalizeUnitForm} from './preferences.mjs';
import {openCharacterGenerator} from './generator.mjs';
import {actorView,itemView,escapeHTML} from "./view.mjs";
import {CLASSES,ATTRIBUTES,modifier} from "./rules.mjs";
import {commonCreatureSave,adjustmentUpdate} from "./adjustments.mjs";
import {chatCard} from "./chat.mjs";
import {openPortrait,choosePortrait} from "./portraits.mjs";
const {ActorSheetV2,ItemSheetV2} = foundry.applications.sheets;
const {DialogV2} = foundry.applications.api;
const notify = error => {console.error("D20Age",error); ui.notifications.error(error.message || "Não foi possível concluir a ação.");};
function fragment(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup;
  return template.content;
}
export class D20AgeActorSheet extends ActorSheetV2 {
  static DEFAULT_OPTIONS = {
    classes:["d20age-sheet"],tag:"form",position:{width:860,height:850},window:{resizable:true},
    form:{submitOnChange:true,closeOnSubmit:false,handler:D20AgeActorSheet.onSubmit}
  };
  static async onSubmit(event,form,formData) {
    if (!this.isEditable) return;
    const updates=normalizeUnitForm(formData.object);
    if(this.document.type==='character'&&Number(updates['system.level'])>this.document.system.level)return advanceLevel(this.document,updates['system.level'],updates);
    if(this.document.type==='character'&&Number(updates['system.level'])<this.document.system.level)return reduceLevel(this.document,updates['system.level'],updates);
    return this.document.update(updates);
  }
  async _prepareContext(options) {
    return {...await super._prepareContext(options),actor:this.actor,activeSection:this._section ?? "attributes"};
  }
  async _renderHTML(context) {
    return fragment(actorView(context.actor,{tab:context.activeSection,editable:this.isEditable}));
  }
  _replaceHTML(result,content) {content.replaceChildren(result);}
  async _onRender(context,options) {
    await super._onRender(context,options);
    this.window?.controlsDropdown?.classList.add("d20age-window-controls");
    if (!this.isEditable) this.element.querySelectorAll("input,select,textarea").forEach(field=>field.disabled=true);
    const portrait = this.element.querySelector(".portrait-button");
    portrait?.addEventListener("contextmenu",event=>{
      event.preventDefault();
      choosePortrait(this).catch(notify);
    });
    const paper = this.element.querySelector(".sheet-paper");
    if (this.isEditable && paper) {
      paper.addEventListener("dragover",event=>event.preventDefault());
      paper.addEventListener("drop",event=>this._onDrop(event).catch(notify));
      paper.querySelectorAll("[data-item-id][draggable=\"true\"]").forEach(row=>row.addEventListener("dragstart",event=>{
        const item = this.actor.items.get(row.dataset.itemId);
        if (item) event.dataTransfer.setData("text/plain",JSON.stringify(item.toDragData()));
      }));
    }
  }
  async _onDrop(event) {
    event.preventDefault();
    if (!this.isEditable || event.d20ageHandled) return;
    event.d20ageHandled = true;
    return super._onDrop(event);
  }
  async _onClickAction(event,target) {
    try {await this.handleAction(target);} catch(error) {notify(error);}
  }
  async handleAction(target) {
    const action = target.dataset.action, id = target.dataset.itemId, item = this.actor.items.get(id);
    if (action === "portrait-view") return openPortrait(this.actor);
    if (action === "section") {
      if (!["attributes","equipment","abilities","magic","notes","adventure","adjustments"].includes(target.dataset.section)) return;
      this._section = target.dataset.section;
      return this.render({force:true});
    }
    if (action === "save") return this.actor.rollSave(target.dataset.save);
    if (action === "morale") return this.actor.rollMorale();
    if (action === "item-chat") return item?.sendDescription();
    if (action === "item-edit") return item?.sheet.render({force:true});
    if (action === "attack") return item?.rollAttack();
    if (action === "damage") return item?.rollDamage();
    if (!this.isEditable || !this.actor.isOwner) return;
    if (action === "adjust-step" || action === "adjust-reset") {
      const updates=adjustmentUpdate(this.actor.system,target.dataset);
      if (updates) return this.actor.update(updates);
      return;
    }
    if (action === "creature-save" && this.actor.type === "creature") {
      const updates=commonCreatureSave(target.closest(".creature-save").querySelector("input").value);
      return this.actor.update(updates);
    }
    if(action==='level-up')return advanceLevel(this.actor);
    if(action==='roll-creature-hp')return rollCreatureHP(this.actor);
    if(action==='initiative-individual'||action==='initiative-group'){
      target.disabled=true;
      try {return await rollInitiative({actor:this.actor,group:action==='initiative-group'});}finally{target.disabled=false;this.render({force:true});}
    }
    if(action==='memory-mode')return this.actor.update(memoryModeUpdate(this.actor.system,target.dataset.manual==='true'));
    if(action==='memory-step'){const update=memoryStepUpdate(this.actor.system,target.dataset);if(update)return this.actor.update(update);}
    if(action==='effect-remove')return this.actor.deleteEmbeddedDocuments('ActiveEffect',[target.dataset.effectId]);
    if(action==='spell-damage')return rollSpell(item,'damage');
    if(action==='spell-heal')return rollSpell(item,'healing');
    if(action==='spell-temp')return rollSpell(item,'temporary');
    if(action==='spell-effect')return applySpellResult(item,'effect');
    if(action==='spell-last'&&item?._lastSpellResult)return applySpellResult(item,item._lastSpellResult.kind,item._lastSpellResult.amount);
    if (action === "cast") return item?.cast();
    if (action === "item-equip") return item?.update({"system.equipped":!item.system.equipped});
    if (action === "item-create") {
      const type = target.dataset.type;
      if (!["weapon","armor","equipment","spell","ability"].includes(type)) return;
      const [created] = await this.actor.createEmbeddedDocuments("Item",[{name:"Novo registro",type,img:`systems/d20age/assets/crest.svg`}]);
      return created.sheet.render({force:true});
    }
    if (action === "item-delete" && item) {
      const confirmed = await DialogV2.confirm({window:{title:"Excluir registro"},content:`<p>Excluir <b>${escapeHTML(item.name)}</b> desta ficha?</p>`});
      if (confirmed) return this.actor.deleteEmbeddedDocuments("Item",[item.id]);
    }
    if (action === "restore-spells") {
      const confirmed = await DialogV2.confirm({window:{title:"Preparar magia"},content:"<p>A mesa confirmou sono ininterrupto, intervalo de 24 horas e uma hora de preparação? Isso restaura as memorizações e o espaço oculto.</p>"});
      if (!confirmed) return;
      const changes = this.actor.items.filter(i=>i.type==="spell").map(i=>({_id:i.id,"system.used":0}));
      if (changes.length) await this.actor.updateEmbeddedDocuments("Item",changes);
      return this.actor.update({"system.hiddenUsed":false});
    }
    if (action === "generate") return openCharacterGenerator({actor:this.actor});
  }
  async generateCharacter() {
    if (this.actor.type !== "character" || this.actor.system.level !== 1) return ui.notifications.warn("A geração inicial está disponível apenas no nível 1.");
    const confirmed = await DialogV2.confirm({window:{title:"Gerar aventureiro"},content:"<p>Substituir os seis atributos, os PV e as moedas iniciais? Os atributos serão rolados com 3d6 em ordem; PV usam o DV da classe e moedas usam 3d6 × 10 po.</p>"});
    if (!confirmed) return;
    const updates = {}, rolls = [];
    let constitution = 0;
    for (const [key,label] of Object.entries(ATTRIBUTES)) {
      const roll = await new Roll("3d6").evaluate();
      updates[`system.attributes.${key}.value`] = roll.total;
      updates[`system.attributes.${key}.bonus`] = 0;
      rolls.push([label,roll.total]);
      if (key === "con") constitution = modifier(roll.total);
    }
    const cls = CLASSES[this.actor.system.classId];
    const hpRoll = await new Roll(`1d${cls.die}`).evaluate();
    const hp = Math.max(1,hpRoll.total+constitution+(this.actor.system.classId === "dwarf" ? 1 : 0));
    updates["flags.d20age.hpHistory"]=[{level:1,classId:this.actor.system.classId,formula:`1d${cls.die}`,die:hpRoll.total,constitution,robust:this.actor.system.classId==="dwarf"?1:0,gain:hp,at:Date.now()}];
    updates["system.hp.max"] = hp;
    updates["system.hp.value"] = hp;
    const money = await new Roll("3d6 * 10").evaluate();
    for (const coin of ["cp","sp","ep","gp","pp"]) updates[`system.coins.${coin}`] = coin === "gp" ? money.total : 0;
    await this.actor.update(updates);
    return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),content:chatCard({type:"generation",title:"Geração inicial",subtitle:"3d6 em ordem",rows:[...rolls,["PV",hp],["Recursos",`${money.total} po`]],footnote:`DV ${hpRoll.total} · CON ${constitution} · robustez ${this.actor.system.classId === "dwarf" ? 1 : 0}`})});
  }
}
export class D20AgeItemSheet extends ItemSheetV2 {
  static DEFAULT_OPTIONS = {
    classes:["d20age-sheet"],tag:"form",position:{width:580,height:740},window:{resizable:true},
    form:{submitOnChange:true,closeOnSubmit:false,handler:D20AgeItemSheet.onSubmit}
  };
  static async onSubmit(event,form,formData) {
    if (!this.isEditable) return;
    const updates=normalizeUnitForm(formData.object);
    if (this.document.type === 'spell'){
      const memorized=Number(updates['system.memorized']??this.document.system.memorized),used=Number(updates['system.used']??this.document.system.used);
      if(used>memorized)updates['system.used']=memorized;
      const circle=Number(updates['system.circle']??this.document.system.circle),prepared=Number(updates['system.preparedCircle']??this.document.system.preparedCircle);
      if(prepared<circle)updates['system.preparedCircle']=circle;
    }
    return this.document.update(updates);
  }
  async _onClickAction(event,target) {
    try {
      const action=target.dataset.action;
      if(action==='spell-tab'&&['basic','effects','description'].includes(target.dataset.tab)){this._spellTab=target.dataset.tab;return this.render({force:true});}
      if(action==='item-chat')return await this.document.sendDescription();
      if(!this.isEditable||!this.document.isOwner)return;
      if(this.document.type==='spell'){
        let updates;
        if(action==='spell-group')updates=spellGroupUpdate(this.document,target.dataset.group);
        if(action==='spell-step')updates=spellStepUpdate(this.document.system,target.dataset);
        if(action==='spell-formula'&&['system.spellDamage','system.spellHealing','system.spellTemporary'].includes(target.dataset.path)&&['1d4','1d6','1d8','2d6'].includes(target.dataset.formula))updates={[target.dataset.path]:target.dataset.formula};
        if(action==='adjust-step'&&['effectAC','effectSave','effectHP','effectAttack','effectDamage'].some(key=>target.dataset.path===`system.${key}`)&&[-1,1].includes(Number(target.dataset.delta)))updates={[target.dataset.path]:this.document.system[target.dataset.path.slice(7)]+Number(target.dataset.delta)};
        if(updates)return await this.document.update(updates);
      }
      if(action==='spell-damage')return await rollSpell(this.document,'damage');
      if(action==='spell-heal')return await rollSpell(this.document,'healing');
      if(action==='spell-temp')return await rollSpell(this.document,'temporary');
      if(action==='spell-effect')return await applySpellResult(this.document,'effect');
      if(action==='spell-last'&&this.document._lastSpellResult)return await applySpellResult(this.document,this.document._lastSpellResult.kind,this.document._lastSpellResult.amount);
    } catch(error) {notify(error);}
  }
  async _renderHTML() {return fragment(itemView(this.document,{spellTab:this._spellTab??'basic'}));}
  _replaceHTML(result,content) {content.replaceChildren(result);}
  async _onRender(context,options) {
    await super._onRender(context,options);
    this.window?.controlsDropdown?.classList.add("d20age-window-controls");
    if (!this.isEditable) this.element.querySelectorAll("input,select,textarea").forEach(field=>field.disabled=true);
  }
}

export class D20AgeCreatureSheet extends D20AgeActorSheet {
  static DEFAULT_OPTIONS={classes:["d20age-creature-sheet"],position:{width:620,height:760}};
}

export class D20AgeInkActorSheet extends D20AgeActorSheet {
 static DEFAULT_OPTIONS={classes:["d20age-sheet","d20age-ink-sheet"],position:{width:1080,height:940}};
 async _renderHTML(context){return fragment(actorView(context.actor,{tab:context.activeSection,editable:this.isEditable,style:"ink"}));}
}

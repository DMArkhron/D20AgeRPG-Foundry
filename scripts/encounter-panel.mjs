// A private GM journal keeps independent encounter records between sessions.
import {hitDiceFormula,healthAfter} from './health.mjs';
import {escapeHTML as e} from './view.mjs';
import {chatCard} from './chat.mjs';
import {attackResult,signed,SAVES} from './rules.mjs';
import {combatRules,formattedMeasure} from './preferences.mjs';
let panel,recordPromise;
function gm(){if(!game.user.isGM)throw Error('O painel de criaturas é exclusivo do mestre.');}
export async function encounterRecord(){
 gm();const old=game.journal?.find(j=>j.flags?.d20age?.encounterRecord);if(old)return old;
 if(recordPromise)return recordPromise;
 recordPromise=JournalEntry.create({name:'D20Age · Painel de criaturas',ownership:{default:0},flags:{d20age:{encounterRecord:true,encounterRows:[]}}});
 try{return await recordPromise;}finally{recordPromise=null;}
}
export function creatureSnapshot(actor,rows=[]){
 if(actor.type!=='creature')throw Error('Arraste uma ficha de criatura.');
 const d=actor.system.derived,s=actor.system;
 let formula=s.hpFormula?.trim();try{if(s.rollHPOnCreate!==false)formula||=hitDiceFormula(s.hitDice);}catch{formula='';}
 const number=Math.max(0,...rows.filter(r=>r.actorUuid===actor.uuid).map(r=>r.number))+1;
 return {id:foundry.utils.randomID(),number,name:`${actor.name} ${number}`,actorUuid:actor.uuid,img:actor.img,hitDice:s.hitDice,formula,
  hp:s.rollHPOnCreate===false?{value:s.hp.value,max:s.hp.max,temp:s.hp.temp??0}:{value:0,max:1,temp:0},rolled:s.rollHPOnCreate===false,initialHP:s.rollHPOnCreate===false?s.hp.max:null,notes:actor.flags?.d20age?.hpRule??'',ac:d.ac,thac0:d.thac0,attackBonus:d.attackBonus,morale:s.morale,movement:d.move.value,
  saves:structuredClone(d.saves),attacks:Array.from(actor.items).filter(i=>i.type==='weapon').map(i=>({id:i.id,name:i.name,damage:i.system.damage,bonus:d.attackBonus+i.system.attackBonus,damageBonus:(i.system.damageBonus??0)+(s.combat.damageBonus??0)+(i.system.mode==='melee'?d.mods.str:0)-s.conditions.exhaustion}))};
}
export function encounterView(rows){
 return `<div class="sheet-paper encounter-paper"><header class="masthead"><div><span class="eyebrow">D20AGE · MESTRE</span><h1>Livro de encontros</h1></div></header><p class="hint">Arraste criaturas do compêndio ou do mundo. Cada exemplar tem PV próprios; estas anotações não alteram a ficha original. Cada nova criatura recebe seus DV rolados.</p><div class="encounter-drop" tabindex="0">+ Arraste uma ficha de criatura aqui</div><div class="record-actions"><button type="button" data-action="clear">Encerrar encontro / limpar painel</button></div><div class="encounter-rows">${rows.map(r=>`<article class="encounter-row" data-row="${e(r.id)}"><header><img src="${e(r.img)}" alt=""><input data-field="name" value="${e(r.name)}" aria-label="Nome do exemplar"><button type="button" data-action="open" data-id="${r.id}">Ficha</button><button type="button" data-action="duplicate" data-id="${r.id}">+ Exemplar</button><button type="button" data-action="remove" data-id="${r.id}">Remover</button></header><div class="encounter-stats">${[['CA',r.ac],['TAC0',r.thac0],['MV',formattedMeasure(r.movement,'distance')],['DV',r.hitDice],['Moral',r.morale]].map(([k,v])=>`<span>${k}<b>${e(v)}</b></span>`).join('')}<label>PV <input data-field="hp" type="number" value="${r.hp.value}" aria-label="PV atuais"></label><label>Máximos <input data-field="max" type="number" min="1" value="${r.hp.max}"></label></div><div class="record-actions"><label>DV → fórmula <input data-field="formula" value="${e(r.formula)}"></label><button type="button" data-action="hp" data-id="${r.id}">${r.rolled?'Rerrolar PV':'Rolar PV'}</button><label>Dano / cura <input type="number" min="0" value="0" data-amount aria-label="Quantidade de dano ou cura"></label><button type="button" data-action="damage" data-id="${r.id}">− Dano</button><button type="button" data-action="heal" data-id="${r.id}">+ Cura</button></div><p class="hint">${r.rolled?`PV rolados: ${e(r.formula)} → ${r.initialHP} · ${r.hp.value<=0?'Incapacitado / morto; arbitrar':'Em combate'}`:'DV especial: ajuste a fórmula ou informe PV manualmente.'}</p><div class="record-actions">${Object.entries(SAVES).map(([k,label])=>`<button type="button" data-action="save" data-id="${r.id}" data-save="${k}">${label} ${r.saves[k].target}</button>`).join('')}<button type="button" data-action="morale" data-id="${r.id}">Moral</button></div><div class="encounter-attacks">${r.attacks.map(a=>`<div><b>${e(a.name)}</b><span>${e(a.damage)}</span><button type="button" data-action="attack" data-id="${r.id}" data-attack="${e(a.id)}">Atacar</button><button type="button" data-action="roll-damage" data-id="${r.id}" data-attack="${e(a.id)}">Dano</button></div>`).join('')}</div><label>Anotações do exemplar <textarea data-field="notes" rows="2">${e(r.notes)}</textarea></label></article>`).join('')||'<p class="empty">O encontro ainda está vazio.</p>'}</div></div>`;
}
export class EncounterPanel extends foundry.applications.api.ApplicationV2{
 static DEFAULT_OPTIONS={classes:['d20age-sheet','d20age-encounter'],position:{width:920,height:880},window:{title:'D20Age · Painel de criaturas',resizable:true}};
 async _renderHTML(){gm();this.record=await encounterRecord();const t=document.createElement('template');t.innerHTML=encounterView(this.record.flags.d20age.encounterRows??[]);return t.content;}
 _replaceHTML(result,content){content.replaceChildren(result);}
 async _onRender(context,options){await super._onRender(context,options);const paper=this.element.querySelector('.encounter-paper');paper.addEventListener('dragover',ev=>ev.preventDefault());paper.addEventListener('drop',ev=>{ev.preventDefault();this.enqueue(()=>this.drop(ev)).catch(error=>ui.notifications.error(error.message));});paper.addEventListener('change',ev=>this.enqueue(()=>this.change(ev.target)).catch(error=>ui.notifications.error(error.message)));}
 enqueue(operation){this.pending=(this.pending??Promise.resolve()).catch(()=>{}).then(operation);return this.pending;}
 async save(rows){gm();const box=this.element?.querySelector?.('.window-content');const scroll=box?.scrollTop;await this.record.update({'flags.d20age.encounterRows':rows});await this.render({force:true});if(scroll!==undefined){const next=this.element?.querySelector?.('.window-content');if(next)next.scrollTop=scroll;}return this;}
 rows(){gm();return structuredClone(this.record.flags.d20age.encounterRows??[]);}
 async add(actor){const rows=this.rows();if(rows.length>=100)throw Error('Limite de 100 exemplares por encontro.');const row=creatureSnapshot(actor,rows);if(row.formula){const roll=await new Roll(row.formula).evaluate();row.hp={value:Math.max(1,roll.total),max:Math.max(1,roll.total),temp:0};row.initialHP=row.hp.max;row.rolled=true;}rows.push(row);await this.save(rows);return row;}
 async drop(event){gm();const data=JSON.parse(event.dataTransfer.getData('text/plain'));if(data.type!=='Actor'||typeof data.uuid!=='string')throw Error('Arraste uma ficha de criatura do compêndio ou da lista de atores.');const actor=await fromUuid(data.uuid);if(!actor||!actor.isOwner&&!actor.testUserPermission(game.user,'OBSERVER'))throw Error('Ficha indisponível.');return this.add(actor);}
 async change(field){const id=field.closest('[data-row]')?.dataset.row,rows=this.rows(),row=rows.find(r=>r.id===id);if(!row)return;
  const key=field.dataset.field;if(!['name','notes','formula','hp','max'].includes(key))return;
  if(['name','notes','formula'].includes(key))row[key]=field.value.slice(0,key==='notes'?5000:200);
  if(key==='hp'||key==='max'){const value=Number(field.value);if(!Number.isInteger(value)||(key==='max'&&value<1))throw Error('PV inválidos.');row.hp[key==='hp'?'value':'max']=value;row.rolled=true;}
  return this.save(rows);
 }
 async _onClickAction(event,target){return this.enqueue(()=>this.act(target)).catch(error=>ui.notifications.error(error.message));}
 async act(target){
  gm();const action=target.dataset.action,rows=this.rows(),row=rows.find(r=>r.id===target.dataset.id);
  if(action==='clear'){if(await foundry.applications.api.DialogV2.confirm({window:{title:'Encerrar encontro'},content:'<p>Apagar os exemplares e anotações deste painel?</p>'}))return this.save([]);return;}
  if(!row)return;
  if(action==='open')return (await fromUuid(row.actorUuid))?.sheet.render({force:true});
  if(action==='duplicate'){const actor=await fromUuid(row.actorUuid);if(!actor)throw Error('A ficha original foi removida.');return this.add(actor);}
  if(action==='remove'){if(!await foundry.applications.api.DialogV2.confirm({window:{title:'Remover exemplar'},content:`<p>Remover ${e(row.name)} e suas anotações?</p>`}))return;return this.save(rows.filter(r=>r.id!==row.id));}
  if(action==='hp'){
   if(row.rolled&&!await foundry.applications.api.DialogV2.confirm({window:{title:'Rerrolar dados de vida'},content:'<p>Substituir os PV atuais e máximos deste exemplar?</p>'}))return;
   if(!Roll.validate(row.formula))throw Error('Ajuste a fórmula de PV deste exemplar.');const roll=await new Roll(row.formula).evaluate();row.hp={value:Math.max(1,roll.total),max:Math.max(1,roll.total),temp:0};row.initialHP=row.hp.max;row.rolled=true;
  }else if(['damage','heal'].includes(action)){if(!row.rolled)throw Error('Determine os PV antes de aplicar dano ou cura.');const amount=Number(target.closest('[data-row]').querySelector('[data-amount]').value);Object.assign(row.hp,healthAfter(row.hp,amount,action));}
  else if(['attack','roll-damage','save','morale'].includes(action)){
   if(!row.rolled)throw Error('Determine os PV deste exemplar antes de rolar.');
   const attack=row.attacks.find(a=>a.id===target.dataset.attack),save=row.saves[target.dataset.save];
   const formula=action==='morale'?'2d6':action==='save'?`1d20 ${signed(save.bonus)}`:action==='attack'?`1d20 ${signed(attack.bonus)}`:`${attack.damage} ${signed(attack.damageBonus)}`;
   if(!Roll.validate(formula))throw Error('Fórmula de rolagem inválida.');const roll=await new Roll(formula).evaluate();let outcome='';
   if(action==='attack'){const targets=Array.from(game.user.targets??[]);if(targets.length>1)throw Error('Selecione no máximo um alvo.');const ac=targets[0]?.actor?.system.derived.ac??null;const natural=roll.dice[0].results.find(r=>r.active!==false).result;const result=attackResult({natural,total:roll.total,thac0:row.thac0,ac,naturalRules:combatRules().naturalRules});outcome=result.hit===null?`CA atingida: ${result.reached}`:result.hit?'Acerto':'Erro';}
   if(action==='save')outcome=roll.total>=save.target?'Sucesso':'Falha';if(action==='morale')outcome=roll.total<=row.morale?'Mantém posição':'Foge ou se rende';
   return roll.toMessage({speaker:ChatMessage.getSpeaker(),flavor:chatCard({title:row.name,subtitle:action==='roll-damage'?`Dano · ${attack.name}`:action==='attack'?attack.name:action==='save'?SAVES[target.dataset.save]:'Moral',outcome,rows:[['Fórmula',formula]]})});
  }
  return this.save(rows);
 }
}
export async function openEncounterPanel(){gm();panel??=new EncounterPanel();return panel.render({force:true});}
export function addEncounterButton(app,element){if(!game.user.isGM)return;const root=element instanceof HTMLElement?element:element?.[0];if(!root||root.querySelector('.d20age-encounter-launch'))return;const b=document.createElement('button');b.type='button';b.className='d20age-encounter-launch';b.textContent='Painel de criaturas';b.addEventListener('click',()=>openEncounterPanel().catch(e=>ui.notifications.error(e.message)));(root.querySelector('.directory-header')??root).append(b);}

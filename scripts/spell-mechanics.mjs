import {SAVES} from './rules.mjs';
import {healthAfter} from './health.mjs';
import {chatCard} from './chat.mjs';
import {escapeHTML as e} from './view.mjs';
export function spellFormula(item,kind){
 const level=Math.max(1,item.actor?.system.level??1),circle=item.system.preparedCircle??item.system.circle??1;
 if(kind==='damage'&&item.system.spellScaling==='missiles')return '1d6+1'; // one missile; targets may differ
 if(kind==='damage'&&item.system.spellScaling==='level')return `${level}d6`;
 if(kind==='healing'&&item.system.spellScaling==='circle')return `${circle}d6+${circle}`;
 if(kind==='temporary'&&item.system.spellScaling==='temporaryLevel')return `${level}d4`;
 return item.system[kind==='damage'?'spellDamage':kind==='healing'?'spellHealing':'spellTemporary']?.trim()??'';
}
export function spellEffectData(item){
 const s=item.system,changes=[];const add=(key,value)=>{if(Number(value))changes.push({key,mode:2,value:String(Number(value)),priority:20});};
 add('system.combat.acAdjustment',s.effectAC);add('system.combat.attackBonus',s.effectAttack);add('system.combat.damageBonus',s.effectDamage);add('system.hp.max',s.effectHP);
 for(const key of Object.keys(SAVES))add(`system.saves.${key}.bonus`,s.effectSave);
 if(!changes.length)throw Error('Configure ao menos um ajuste numérico na magia.');
 return {name:item.name,img:item.img,origin:item.uuid,transfer:false,disabled:false,changes,flags:{d20age:{spellEffect:true,durationLabel:s.duration,condition:s.effectCondition}},duration:{startTime:game.time?.worldTime??0}};
}
export async function rollSpell(item,kind){
 if(item.type!=='spell'||!item.actor?.isOwner)throw Error('Abra uma magia de sua ficha para rolar.');
 const formula=spellFormula(item,kind);if(!formula||!Roll.validate(formula))throw Error('Configure uma fórmula válida na magia.');
 const roll=await new Roll(formula,item.actor.getRollData()).evaluate();
 item._lastSpellResult={kind,amount:Math.max(0,roll.total)};
 const label={damage:'Dano',healing:'Cura',temporary:'PV temporários'}[kind];
 await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:item.actor}),flavor:chatCard({type:'spell',title:item.name,subtitle:label,rows:[['Fórmula',formula],['Alvo',item.system.target||'Consultar descrição']],footnote:item.system.spellScaling==='missiles'?`Uma flecha por rolagem · ${Math.ceil(item.actor.system.level/2)} flecha(s) nesta conjuração. Selecione o alvo de cada flecha.`:'Salvaguardas, redução de dano e condições devem ser resolvidas antes de aplicar.'})});
 await applySpellResult(item,kind,Math.max(0,roll.total));return roll;
}
export async function applySpellResult(item,kind,amount=null){
 if(item.type!=='spell'||!item.actor?.isOwner)throw Error('Use uma magia da sua ficha.');
 const targets=[...new Map(Array.from(game.user.targets??[]).map(t=>[t.actor?.uuid??t.actor?.id,t.actor]).filter(([,a])=>a)).values()];
 if(!targets.length){ui.notifications.info?.('Resultado rolado. Selecione um token e use “Aplicar último resultado”.');item._lastSpellResult=kind==='effect'?null:{kind,amount};return;}
 const allowed=targets.filter(a=>a.isOwner);if(allowed.length!==targets.length)ui.notifications.warn('Somente alvos que você pode editar serão alterados. O mestre aplica nos demais.');
 if(!allowed.length)return;
 const conditional=item.system.effectCondition;
 const accepted=await foundry.applications.api.DialogV2.prompt({window:{title:'Aplicar magia aos alvos'},classes:['d20age-tool-dialog'],rejectClose:false,content:`<p>${e(item.name)} → ${allowed.map(a=>e(a.name)).join(', ')}</p>${conditional?`<p><b>Condição:</b> ${e(conditional)}. Aplique somente quando atendida.</p>`:''}${kind!=='effect'?`<label>Quantidade após salvaguarda/resistência <input type="number" name="amount" min="0" step="1" value="${amount}"></label>`:'<p>Os ajustes ficarão em Efeitos da ficha. Remova ao terminar a duração.</p>'}`,ok:{label:'Aplicar',callback:(_event,button)=>kind==='effect'?true:Number(button.form.elements.amount.value)}});
 if(accepted===null||accepted===undefined)return;
 if(kind!=='effect'&&(!Number.isInteger(accepted)||accepted<0))throw Error('Quantidade inválida.');
 for(const actor of allowed){
  if(kind==='effect')await actor.createEmbeddedDocuments('ActiveEffect',[spellEffectData(item)]);
  else{const hp=healthAfter(actor.system.hp,accepted,{damage:'damage',healing:'heal',temporary:'temporary'}[kind]);await actor.update({'system.hp.value':hp.value,'system.hp.temp':hp.temp});}
 }
 item._lastSpellResult=kind==='effect'?null:{kind,amount};
}

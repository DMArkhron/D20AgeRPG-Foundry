// Reversible editor operations shared by the native sheet and offline preview.
export const SPELL_GROUPS={
 damage:{label:'Dano',hint:'Rolar o dano da magia.',fields:['spellDamage'],initial:'1d6',icon:'damage'},
 healing:{label:'Cura',hint:'Restaurar PV até o máximo.',fields:['spellHealing'],initial:'1d6',icon:'heal'},
 temporary:{label:'PV temporários',hint:'Vida extra que absorve dano.',fields:['spellTemporary'],initial:'1d4',icon:'heal'},
 defense:{label:'Defesa (CA)',hint:'Ajustar a proteção do alvo.',fields:['effectAC'],initial:0,icon:'save'},
 saves:{label:'Salvaguardas',hint:'Bônus nas cinco salvaguardas.',fields:['effectSave'],initial:0,icon:'save'},
 maximum:{label:'PV máximos',hint:'Ajustar o limite de vida.',fields:['effectHP'],initial:0,icon:'heal'},
 attack:{label:'Acerto',hint:'Bônus nas jogadas de ataque.',fields:['effectAttack'],initial:0,icon:'attack'},
 bonusDamage:{label:'Bônus de dano',hint:'Ajustar o dano dos ataques.',fields:['effectDamage'],initial:0,icon:'damage'}
};
export function spellGroupEnabled(item,key){
 const group=SPELL_GROUPS[key];return !!group && (!!item.flags?.d20age?.spellEditor?.[key] || group.fields.some(f=>!!item.system[f]));
}
export function spellGroupUpdate(item,key){
 const group=SPELL_GROUPS[key];if(!group)return null;
 const enabled=!spellGroupEnabled(item,key),updates={[`flags.d20age.spellEditor.${key}`]:enabled};
 for(const f of group.fields)updates[`system.${f}`]=enabled?group.initial:typeof group.initial==='string'?'':0;
 if(!enabled && ['damage','healing','temporary'].includes(key) && !['damage','healing','temporary'].filter(k=>k!==key).some(k=>spellGroupEnabled(item,k)))updates['system.spellScaling']='none';
 return updates;
}
export function spellStepUpdate(system,{path,delta,value}={}){
 const limits={circle:[1,6],preparedCircle:[1,6],memorized:[0,Number.MAX_SAFE_INTEGER],used:[0,system.memorized??0]};
 const key=String(path??'').replace(/^system\./,'');if(!limits[key])return null;
 const n=value===undefined?Number(system[key]??0)+Number(delta):Number(value);
 if(!Number.isInteger(n))return null;
 const [min,max]=limits[key],next=Math.max(min,Math.min(max,n)),updates={[`system.${key}`]:next};
 if(key==='circle' && next>system.preparedCircle)updates['system.preparedCircle']=next;
 if(key==='preparedCircle' && next<system.circle)updates['system.preparedCircle']=system.circle;
 if(key==='memorized' && next<system.used)updates['system.used']=next;
 return updates;
}

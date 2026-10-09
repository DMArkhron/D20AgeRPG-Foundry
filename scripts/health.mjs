// LB V2, p.60 (progressão), p.115 (criaturas). Asteriscos indicam poderes, não DV.
import {CLASSES,modifier} from './rules.mjs';
import {chatCard} from './chat.mjs';
export function hitDiceFormula(value){
 const raw=String(value??'').replace(/\([^)]*\)/g,'').replace(/\*/g,'').replace(/\s/g,'').replace(/−/g,'-');
 if(['½','1/2'].includes(raw))return '1d4';
 if(/^\d+d(?:4|6|8|10|12)(?:[+-]\d+)?$/i.test(raw))return raw.toLowerCase();
 const m=raw.match(/^(\d+)([+-]\d+)?$/);if(!m||Number(m[1])<1||Number(m[1])>100)throw Error('DV especial: informe uma fórmula de PV antes de rolar.');
 return `${Number(m[1])}d8${m[2]??''}`;
}
export function hpGain(die,constitution,classId){return Math.max(1,Number(die)+constitution+(classId==='dwarf'?1:0));}
export function healthAfter(hp,amount,mode){
 if(!Number.isFinite(amount)||amount<0)throw Error('Informe dano ou cura não negativos.');
 amount=Math.floor(amount);let value=hp.value,temp=hp.temp??0;
 if(mode==='damage'){const absorbed=Math.min(temp,amount);temp-=absorbed;value-=amount-absorbed;}
 else if(mode==='heal')value=Math.min(hp.max,value+amount);
 else if(mode==='temporary')temp=Math.max(temp,amount);
 else throw Error('Operação de vida inválida.');
 return {value,temp};
}
export async function rollCreatureHP(actor,{confirm=true,announce=true}={}){
 if(!actor.isOwner||actor.type!=='creature'||actor.pack)throw Error('Use uma criatura do mundo ou um exemplar no painel.');
 if(actor.system.rollHPOnCreate===false&&!actor.system.hpFormula?.trim())throw Error('Esta criatura usa PV definidos pela mesa ou uma regra especial. Informe uma fórmula explícita para substituir esses PV.');
 const formula=actor.system.hpFormula?.trim()||hitDiceFormula(actor.system.hitDice);
 if(!Roll.validate(formula))throw Error('Fórmula de PV inválida.');
 if(confirm&&!await foundry.applications.api.DialogV2.confirm({window:{title:'Rolar PV da criatura'},content:`<p>Rolar ${formula} e substituir os PV atuais e máximos deste exemplar?</p>`}))return;
 const roll=await new Roll(formula).evaluate();const hp=Math.max(1,roll.total);
 await actor.update({'system.hp.value':hp,'system.hp.max':hp,'system.hp.temp':0,'flags.d20age.hpRolled':{formula,total:hp,at:Date.now()}});
 if(announce)await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),whisper:game.users?.filter(u=>u.isGM).map(u=>u.id)??[],flavor:chatCard({title:actor.name,subtitle:'Dados de vida da criatura',rows:[['DV',actor.system.hitDice],['PV',hp],['Fórmula',formula]]})});
 return roll;
}
const leveling=new WeakSet();
export async function advanceLevel(actor,target=actor.system.level+1,extra={}){
 if(!actor.isOwner||actor.type!=='character')throw Error('Somente o proprietário pode avançar esta ficha.');
 if(leveling.has(actor))return;
 target=Number(target);const start=actor.system.level;
 if(!Number.isInteger(target)||target<=start||target>10)throw Error('Escolha um nível superior, até 10.');
 leveling.add(actor);
 try{
 const classId=extra['system.classId']??actor.system.classId,cls=CLASSES[classId];
 if(!cls)throw Error('Classe inválida.');
 if(!await foundry.applications.api.DialogV2.confirm({window:{title:'Avançar nível · dados de vida'},content:`<p>Do nível ${start} ao ${target}: rolar um d${cls.die} por novo nível, somar CON${classId==='dwarf'?' e +1 de robustez':''} e registrar cada resultado? Os ferimentos atuais serão mantidos.</p>`}))return false;
 const con=modifier(Number(extra['system.attributes.con.value']??actor.system.attributes.con.value))+Number(extra['system.attributes.con.bonus']??actor.system.attributes.con.bonus);
 const history=structuredClone(actor.flags?.d20age?.hpHistory??[]),rolls=[];
 if(!history.length)history.push({level:start,baseline:true,gain:actor._source?.system?.hp?.max??actor.system.hp.max,note:'PV anteriores preservados; dados antigos não informados.'});
 let gain=0;
 for(let level=start+1;level<=target;level++){
  const previous=history.find(r=>r.level===level&&!r.baseline);
  if(previous){gain+=previous.gain;continue;}
  const roll=await new Roll(`1d${cls.die}`).evaluate();const points=hpGain(roll.total,con,classId);gain+=points;
  history.push({level,classId,formula:`1d${cls.die}`,die:roll.total,constitution:con,robust:classId==='dwarf'?1:0,gain:points,at:Date.now()});rolls.push({roll,level,points});
 }
 const baseMax=actor._source?.system?.hp?.max??actor.system.hp.max;
 await actor.update({...extra,'system.level':target,'system.hp.max':baseMax+gain,'system.hp.value':actor.system.hp.value+gain,'flags.d20age.hpHistory':history});
 for(const {roll,level,points} of rolls)await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:chatCard({title:actor.name,subtitle:`Progressão · nível ${level}`,rows:[['CON',con],['Robustez',classId==='dwarf'?1:0],['PV ganhos',points]],footnote:'Mínimo 1 PV por nível. Ferimentos preservados.'})});
 return actor;
 }finally{leveling.delete(actor);}
}
export async function reduceLevel(actor,target,extra={}){
 if(!actor.isOwner||actor.type!=='character')throw Error('Sem permissão para corrigir o nível.');
 target=Number(target);if(!Number.isInteger(target)||target<1||target>=actor.system.level)throw Error('Nível inválido.');
 const history=actor.flags?.d20age?.hpHistory??[];
 const removed=history.filter(r=>!r.baseline&&r.level>target&&r.level<=actor.system.level).reduce((sum,r)=>sum+r.gain,0);
 if(!await foundry.applications.api.DialogV2.confirm({window:{title:'Corrigir nível'},content:`<p>Reduzir para o nível ${target} e descontar ${removed} PV registrados? Dados antigos não registrados serão preservados. O histórico será mantido para evitar novos sorteios ao restaurar esses níveis.</p>`}))return false;
 const baseMax=actor._source?.system.hp.max??actor.system.hp.max;
 return actor.update({...extra,'system.level':target,'system.hp.max':Math.max(1,baseMax-removed),'system.hp.value':actor.system.hp.value-removed});
}

// LB V2, p.64 (1 coin = 1 cn) and p.120 (domestic animals).
export const PACK_PROFILES = Object.freeze({
 mule:{label:'Mula',normal:4000,max:4000,move:30},
 camel:{label:'Camelo',normal:3000,max:6000,move:50},
 warhorse:{label:'Cavalo de guerra',normal:4000,max:8000,move:40},
 draft:{label:'Cavalo de tração',normal:4500,max:9000,move:40},
 riding:{label:'Cavalo de cavalgada',normal:3000,max:6000,move:80},
 pony:{label:'Pônei',normal:1500,max:3000,move:40}
});
export const PARTY_COINS={cp:'PC',sp:'PP',ep:'PE',gp:'PO',pp:'PL'};
export const physicalItem = item => ['weapon','armor','equipment'].includes(item.type)
 && !item.flags?.d20age?.naturalAttack
 && !(item.type==='weapon'&&item.flags?.d20age?.source==='d20age RPG - LB (V2)'&&Number(item.system.weight||0)===0&&/^\d+\s*[×x]\s*(?:pata|coice|mordida|garra|casco)s?\b/i.test(item.name));
export function cargoWeight(actor,{all=false}={}) {
 const items=Array.from(actor.items??[]).filter(i=>physicalItem(i)&&(all||i.system.carried!==false));
 return items.reduce((n,i)=>n+Number(i.system.quantity||0)*Number(i.system.weight||0),0)+Object.keys(PARTY_COINS).reduce((n,k)=>n+Number(actor.system.coins?.[k]||0),0)+Number(actor.system.extraWeight||0);
}
export function packProfile(actor) {
 const saved=actor.flags?.d20age?.packAnimal;
 if(!saved)return null;
 const profile=PACK_PROFILES[saved.profile]??saved;
 if(!Number.isFinite(profile.max)||profile.max<=0||!Number.isFinite(profile.normal)||profile.normal<0||profile.normal>profile.max||!Number.isFinite(profile.move)||profile.move<0)return null;
 return profile;
}
export function cargoState(actor) {
 const weight=cargoWeight(actor,{all:actor.type==='party'||Boolean(packProfile(actor))});
 if(actor.type==='party')return {weight,max:null,free:null,category:'Reserva · não transportado',value:null};
 const p=packProfile(actor);
 if(p){const overCapacity=weight>p.max,slow=weight>p.normal;const value=overCapacity?0:Math.max(0,(slow?p.move/2:p.move)-(actor.system.conditions?.fatigue?10:0));return {weight,max:p.max,limit:p.max,free:Math.max(0,p.max-weight),normal:p.normal,overCapacity,overloaded:overCapacity,category:overCapacity?'Acima da capacidade':slow?'Carga pesada · metade do movimento':'Carga normal',value,exploration:value*3,running:value*3,travel:value/10};}
 if(actor.type==='creature')return {weight,max:0,free:0,category:'Configure a capacidade',value:actor.system.movement?.base??0};
 const max=actor.system.classId==='gnome'?800:2400;
 return {weight,max,free:Math.max(0,max-weight),category:actor.system.derived?.move?.category??'Carga pessoal',value:actor.system.derived?.move?.value??0};
}
export function assertIncoming(actor,weight) {
 if(!Number.isFinite(weight)||weight<0)throw Error('Peso inválido.');
 const c=cargoState(actor);
 if(c.max!==null&&c.weight+weight>c.max)throw Error(`${actor.name}: capacidade insuficiente. Livre: ${c.free} cn; entrada: ${weight} cn.`);
 if(actor.type==='creature'&&!packProfile(actor))throw Error('Configure a capacidade do animal antes de carregá-lo.');
}
export function transferQuantity(value) {const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw Error('Informe uma quantidade inteira maior que zero.');return n;}
export function partyCanUse(party,actor,user) {
 if(!user||!party.testUserPermission(user,'OWNER'))return false;
 if(actor.uuid===party.uuid)return true;
 if(party.system.carriers.includes(actor.uuid))return actor.type==='creature'&&Boolean(user.isGM||actor.flags?.d20age?.packParties?.includes(party.uuid));
 return party.system.members.includes(actor.uuid)&&actor.testUserPermission(user,'OWNER');
}

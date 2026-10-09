import {PACK_PROFILES,PARTY_COINS,physicalItem,assertIncoming,transferQuantity,partyCanUse} from './party-rules.mjs';
const clone=value=>structuredClone(value);
let operationQueue=Promise.resolve();
const waiting=new Map();
export function enqueuePartyOperation(task){const result=operationQueue.then(task);operationQueue=result.catch(()=>{});return result;}
const activeGM=()=>game.users?.activeGM?.id===game.user.id;
const actorByUuid=async uuid=>{const a=await fromUuid(uuid);if(!a||a.documentName!=='Actor'||a.pack||a.isToken)throw Error('Selecione uma ficha do mundo, sem vínculo a token independente.');return a;};
function writable(party,actor,user){if(!partyCanUse(party,actor,user))throw Error('Você pode movimentar a reserva, os animais vinculados e os seus próprios personagens.');}
export async function executePartyOperation(party,request,user){
 if(party.type!=='party'||!party.testUserPermission(user,'OWNER'))throw Error('Sem permissão para alterar este grupo.');
 if(party.flags?.d20age?.partyTransaction)throw Error('Uma transferência foi interrompida. O mestre deve usar “Recuperar transferência” antes de continuar.');
 const action=request.action;
 if(action==='link'||action==='unlink'){
  const actor=await actorByUuid(request.actor),key=actor.type==='character'?'members':actor.type==='creature'?'carriers':null;
  if(!key)throw Error('Vincule um personagem ou uma criatura.');
  if(!user.isGM&&(key==='carriers'||!actor.testUserPermission(user,'OWNER')))throw Error('Só o mestre vincula animais; jogadores podem vincular seus personagens.');
  if(action==='link'&&key==='carriers'&&!actor.flags?.d20age?.packAnimal){const normalized=actor.name.split('·')[0].trim().toLocaleLowerCase('pt-BR');const profile=Object.entries(PACK_PROFILES).find(([,p])=>p.label.toLocaleLowerCase('pt-BR')===normalized)?.[0];if(profile)await actor.setFlag('d20age','packAnimal',{profile});}
  if(key==='carriers'){
   const grants=new Set(actor.flags?.d20age?.packParties??[]);
   action==='link'?grants.add(party.uuid):grants.delete(party.uuid);
   await actor.setFlag('d20age','packParties',[...grants]);
   if(action==='link')await actor.update({'prototypeToken.actorLink':true});
  }
  const values=new Set(party.system[key]);action==='link'?values.add(actor.uuid):values.delete(actor.uuid);
  await party.update({[`system.${key}`]:[...values]});
  if(action==='link'&&user.isGM&&request.share==='yes'){const permissions={};for(const player of game.users){if(!player.isGM&&party.testUserPermission(player,'OWNER')&&!actor.testUserPermission(player,'OBSERVER'))permissions[`ownership.${player.id}`]=2;}if(Object.keys(permissions).length)await actor.update(permissions);}
  return 'Vínculo atualizado. Os pertences continuam na ficha original.';
 }
 if(action==='remove-missing'){
  if(!user.isGM)throw Error('Apenas o mestre remove vínculos indisponíveis.');
  for(const key of ['members','carriers'])await party.update({[`system.${key}`]:party.system[key].filter(x=>x!==request.actor)});
  return 'Vínculo indisponível removido.';
 }
 if(action==='profile'){
  if(!user.isGM)throw Error('Somente o mestre configura a capacidade.');
  const actor=await actorByUuid(request.actor);if(!party.system.carriers.includes(actor.uuid))throw Error('Animal não vinculado.');
  let p=PACK_PROFILES[request.profile]?{profile:request.profile}: {profile:'custom',label:'Personalizado',normal:Number(request.normal),max:Number(request.max),move:Number(request.move)};
  if(p.profile==='custom'&&(!Number.isFinite(p.normal)||p.normal<0||!Number.isFinite(p.max)||p.max<=0||p.normal>p.max||!Number.isFinite(p.move)||p.move<0))throw Error('Capacidade máxima deve ser positiva e igual ou maior que a normal.');
  const extra=Number(request.extra??0);if(!Number.isFinite(extra)||extra<0)throw Error('Carga adicional inválida.');
  await actor.update({'flags.d20age.packAnimal':p,'system.extraWeight':extra});return 'Capacidade atualizada.';
 }
 const destination=await actorByUuid(request.destination);writable(party,destination,user);
 if(action==='add-coins'){
  if(!Object.hasOwn(PARTY_COINS,request.coin))throw Error('Moeda inválida.');
  const quantity=transferQuantity(request.quantity);assertIncoming(destination,quantity);
  await destination.update({[`system.coins.${request.coin}`]:Number(destination.system.coins[request.coin]||0)+quantity});return 'Moedas adicionadas.';
 }
 if(action==='add-item'){
  let data;
  if(request.item){const original=await fromUuid(request.item);if(original?.documentName!=='Item'||original.parent?.documentName==='Actor')throw Error('Itens de personagens devem ser transferidos, não copiados.');if(!original.testUserPermission(user,'OBSERVER'))throw Error('Item sem permissão de leitura.');data=original.toObject();}
  else{const name=String(request.name??'').trim().slice(0,160),weight=Number(request.weight);if(!name||!Number.isFinite(weight)||weight<0)throw Error('Informe nome e peso válido em cn.');data={name,type:'equipment',img:'systems/d20age/assets/party.svg',system:{weight}};}
  if(!physicalItem(data))throw Error('O inventário aceita armas, proteções e equipamentos.');
  delete data._id;delete data.folder;data.system.quantity=transferQuantity(request.quantity??data.system.quantity??1);data.system.carried=true;data.system.equipped=false;
  assertIncoming(destination,Number(data.system.weight||0)*data.system.quantity);
  await destination.createEmbeddedDocuments('Item',[data]);return 'Item adicionado.';
 }
 if(action!=='transfer')throw Error('Operação desconhecida.');
 const source=await actorByUuid(request.source);writable(party,source,user);
 if(source.uuid===destination.uuid)throw Error('Escolha um destino diferente da origem.');
 const quantity=transferQuantity(request.quantity),tx={source:source.uuid,destination:destination.uuid,at:Date.now(),user:user.id,kind:request.coin?'coin':'item',id:foundry.utils.randomID()};
 if(request.coin){
  if(!Object.hasOwn(PARTY_COINS,request.coin))throw Error('Moeda inválida.');
  Object.assign(tx,{coin:request.coin,sourceBefore:Number(source.system.coins[request.coin]||0),destinationBefore:Number(destination.system.coins[request.coin]||0),quantity});
  if(tx.sourceBefore<quantity)throw Error('Moedas insuficientes na origem.');assertIncoming(destination,quantity);
 }else{
  const item=source.items.get(request.item);if(!item||!physicalItem(item))throw Error('Item não encontrado.');
  if(Number(item.system.quantity)<quantity)throw Error('Quantidade insuficiente na origem.');assertIncoming(destination,Number(item.system.weight||0)*quantity);
  tx.before=item.toObject();tx.item=item.id;tx.quantity=quantity;tx.destinationId=foundry.utils.randomID();
 }
 await party.setFlag('d20age','partyTransaction',tx);
 try{
  if(tx.kind==='coin'){
   await source.update({[`system.coins.${tx.coin}`]:tx.sourceBefore-quantity});
   if(Number(source.system.coins[tx.coin])!==tx.sourceBefore-quantity)throw Error('O débito foi impedido por outra regra do mundo.');
   await destination.update({[`system.coins.${tx.coin}`]:tx.destinationBefore+quantity});
   if(Number(destination.system.coins[tx.coin])!==tx.destinationBefore+quantity)throw Error('O crédito foi impedido por outra regra do mundo.');
  }else{
   // Debit first; a persistent journal allows explicit recovery after interruption.
   await source.updateEmbeddedDocuments('Item',[{_id:tx.item,'system.quantity':tx.before.system.quantity-quantity}]);
   if(source.items.get(tx.item)?.system.quantity!==tx.before.system.quantity-quantity)throw Error('O débito do item foi impedido.');
   const data=clone(tx.before);data._id=tx.destinationId;delete data.folder;data.system.quantity=quantity;data.system.carried=true;data.system.equipped=false;
   await destination.createEmbeddedDocuments('Item',[data],{keepId:true});
   if(destination.items.get(tx.destinationId)?.system.quantity!==quantity)throw Error('A criação do item foi impedida.');
  }
  const label=tx.kind==='coin'?PARTY_COINS[tx.coin]:tx.before.name;
  const history=[{at:tx.at,user:user.name,from:source.name,to:destination.name,label,quantity},...(party.flags?.d20age?.partyHistory??[])].slice(0,20);
  await party.update({'flags.d20age.partyHistory':history,'flags.d20age.-=partyTransaction':null});
  // Keep a zero stack until the durable commit; cleanup must never undo a committed transfer.
  if(tx.kind==='item'&&source.items.get(tx.item)?.system.quantity===0)try{await source.deleteEmbeddedDocuments('Item',[tx.item]);}catch{ /* harmless empty stack */ }
  return `${quantity} × ${label}: ${source.name} → ${destination.name}.`;
 }catch(error){throw Error(`${error.message} A transferência ficou registrada para recuperação pelo mestre; não repita a operação.`);}
}
export async function recoverPartyTransfer(party,user){
 if(!user.isGM)throw Error('Apenas o mestre pode recuperar uma transferência.');
 const tx=party.flags?.d20age?.partyTransaction;if(!tx)return;
 const source=await actorByUuid(tx.source),destination=await actorByUuid(tx.destination);
 if(tx.kind==='coin'){
  const a=Number(source.system.coins[tx.coin]),b=Number(destination.system.coins[tx.coin]);
  if(![tx.sourceBefore,tx.sourceBefore-tx.quantity].includes(a)||![tx.destinationBefore,tx.destinationBefore+tx.quantity].includes(b))throw Error('Os saldos foram alterados depois da interrupção. Confira as fichas e o registro antes de restaurar os saldos esperados.');
  await destination.update({[`system.coins.${tx.coin}`]:tx.destinationBefore});await source.update({[`system.coins.${tx.coin}`]:tx.sourceBefore});
 }else{
  const a=source.items.get(tx.item),b=destination.items.get(tx.destinationId);
  if(!a||![tx.before.system.quantity,tx.before.system.quantity-tx.quantity].includes(a.system.quantity)||(b&&b.system.quantity!==tx.quantity))throw Error('Os itens foram alterados depois da interrupção. Confira o registro e restaure as quantidades esperadas antes de recuperar.');
  if(b)await destination.deleteEmbeddedDocuments('Item',[b.id]);await source.updateEmbeddedDocuments('Item',[{_id:tx.item,'system.quantity':tx.before.system.quantity}]);
 }
 await party.unsetFlag('d20age','partyTransaction');return 'Transferência desfeita: pertences restaurados à origem.';
}
export async function requestPartyOperation(party,data){
 if(!game.users?.activeGM)throw Error('É necessário um mestre conectado para sincronizar os inventários.');
 if(activeGM())return enqueuePartyOperation(()=>data.action==='recover'?recoverPartyTransfer(party,game.user):executePartyOperation(party,data,game.user));
 const id=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{waiting.delete(id);reject(Error('A resposta ainda não chegou. Confira o histórico antes de tentar novamente.'));},30000);
  waiting.set(id,{resolve,reject,timer});
  party.update({[`flags.d20age.partyRequests.${id}`]:data}).catch(error=>{clearTimeout(timer);waiting.delete(id);reject(error);});
 });
}
export function registerPartyService(){
 Hooks.on('updateActor',(party,changes,options,userId)=>{
  if(party.type!=='party')return;
  const expanded=foundry.utils.expandObject(changes),results=expanded.flags?.d20age?.partyResults??{};
  for(const [id,result]of Object.entries(results)){const wait=waiting.get(id);if(wait){clearTimeout(wait.timer);waiting.delete(id);result.error?wait.reject(Error(result.error)):wait.resolve(result.message);}}
  if(!activeGM())return;
  const requests=expanded.flags?.d20age?.partyRequests??{};
  for(const [id,data]of Object.entries(requests)){
   if(id.startsWith('-=')||!data||party.flags?.d20age?.partyResults?.[id])continue;
   const user=game.users.get(userId); // Authenticated document-update origin; never trust an ID in the payload.
   enqueuePartyOperation(async()=>{
    if(!activeGM()||party.flags?.d20age?.partyResults?.[id])return;
    let result;try{result={message:data.action==='recover'?await recoverPartyTransfer(party,user):await executePartyOperation(party,data,user)};}catch(e){result={error:e.message};}
    const changes={[`flags.d20age.partyResults.${id}`]:result,[`flags.d20age.partyRequests.-=${id}`]:null};
    for(const old of Object.keys(party.flags?.d20age?.partyResults??{}).slice(0,-19))changes[`flags.d20age.partyResults.-=${old}`]=null;
    await party.update(changes);
   }).catch(error=>ui.notifications.error(error.message));
  }
 });
}

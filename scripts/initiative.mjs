import {combatRules} from './preferences.mjs';
import {chatCard} from './chat.mjs';
const tokenDocument = token => token?.document ?? token;
const list = collection => Array.from(collection ?? []);
function matchesActor(member,actor){
 if(!actor)return false;
 if(actor.isToken && actor.token)return member.tokenId===actor.token.id && (!member.sceneId || member.sceneId===actor.token.parent?.id);
 return member.actor?.uuid===actor.uuid || (actor.id && member.actorId===actor.id);
}
export function initiativeSummary(actor){
 const members=list(globalThis.game?.combat?.combatants).filter(c=>matchesActor(c,actor));
 const scores=members.map(c=>c.initiative).filter(n=>n!==null && n!==undefined);
 return !members.length ? 'Fora do encontro' : !scores.length ? 'Aguardando rolagem' : `Iniciativa: ${[...new Set(scores)].join(' / ')}`;
}
function sceneTokens(){return list(globalThis.canvas?.scene?.tokens).filter(t=>t.actor);}
function sameToken(combatant,token){return combatant.tokenId===token.id && (!combatant.sceneId || combatant.sceneId===token.parent?.id);}
async function resolveParticipants({actor,group,side},combat){
 const selected=list(globalThis.canvas?.tokens?.controlled).map(tokenDocument);
 let tokens=[],members=[];
 const combatants=list(combat?.combatants);
 if(group){
  if(side==='selected'){
   if(!selected.length)throw Error('Selecione os tokens do grupo no mapa. Eles serão incluídos no encontro automaticamente.');
   tokens=selected;members=combatants.filter(c=>selected.some(t=>sameToken(c,t)));
  }else{
   if(!game.user.isGM)throw Error('Somente o mestre pode rolar por todos os aventureiros ou criaturas. Use Grupo selecionado.');
   const type=side==='party'?'character':'creature';
   tokens=sceneTokens().filter(t=>t.actor.type===type);
   members=combatants.filter(c=>c.actor?.type===type);
  }
 }else{
  if(!actor?.isOwner)throw Error('Você precisa poder editar esta ficha para rolar iniciativa.');
  members=combatants.filter(c=>matchesActor(c,actor));
  tokens=actor.isToken && actor.token ? [actor.token] : sceneTokens().filter(t=>t.actor?.uuid===actor.uuid || (actor.id && t.actorId===actor.id));
  const controlled=tokens.filter(t=>selected.some(s=>s.id===t.id));
  if(controlled.length)tokens=controlled;
  if(tokens.length>1){
   const {escapeHTML}=await import('./view.mjs');
   const id=await foundry.applications.api.DialogV2.prompt({window:{title:'Qual token rolará iniciativa?'},content:`<label>Token <select name="token">${tokens.map(t=>`<option value="${escapeHTML(t.id)}">${escapeHTML(t.name)}</option>`).join('')}</select></label>`,ok:{label:'Rolar iniciativa',callback:(_event,button)=>button.form.elements.token.value}});
   if(!id)return null;tokens=tokens.filter(t=>t.id===id);
  }
  if(tokens.length)members=combatants.filter(c=>tokens.some(t=>sameToken(c,t)));
 }
 tokens=[...new Map(tokens.filter(t=>t.actor || members.some(c=>sameToken(c,t))).map(t=>[`${t.parent?.id??''}.${t.id}`,t])).values()];
 if(!tokens.length&&!members.length)throw Error('Coloque um token no mapa para registrar a iniciativa no rastreador de combate.');
 if(tokens.some(t=>t.actor && !t.actor.isOwner && !game.user.isGM) || members.some(c=>!c.isOwner&&!game.user.isGM))throw Error('Você precisa poder editar todos os combatentes deste grupo.');
 return {tokens,members};
}
let rolling=false;
export async function rollInitiative({actor=null,group=false,side='selected'}={}){
 if(rolling)return;
 rolling=true;
 try{
  let combat=game.combat;
  const participants=await resolveParticipants({actor,group,side},combat);
  if(!participants)return;
  if(!combat){
   if(!game.user.isGM)throw Error('Peça ao mestre para abrir um encontro. Depois você poderá incluir seu token e rolar iniciativa.');
   if(!globalThis.canvas?.scene)throw Error('Abra uma cena para criar o encontro.');
   combat=await CONFIG.Combat.documentClass.create({scene:canvas.scene.id,active:true});
  }
  const missing=participants.tokens.filter(t=>!list(combat.combatants).some(c=>sameToken(c,t)));
  if(missing.length){
   const TokenClass=CONFIG.Token?.documentClass ?? foundry.documents.TokenDocument;
   await TokenClass.createCombatants(missing,{combat});
  }
  const ids=new Set(participants.members.map(c=>c.id));
  const members=list(combat.combatants).filter(c=>ids.has(c.id)||participants.tokens.some(t=>sameToken(c,t)));
  if(!members.length)throw Error('Não foi possível incluir os tokens no encontro. Verifique as permissões de combate.');
  if(members.some(c=>!c.isOwner&&!game.user.isGM))throw Error('Você precisa poder editar todos os combatentes deste grupo.');
  const roll=await new Roll(combatRules().initiative).evaluate();
  for(const member of members)await combat.setInitiative(member.id,roll.total);
  await roll.toMessage({speaker:actor?ChatMessage.getSpeaker({actor}):ChatMessage.getSpeaker(),flavor:chatCard({type:'initiative',title:group?'Iniciativa do grupo':`Iniciativa · ${actor?.name??members[0]?.name??'individual'}`,subtitle:'Registrada no rastreador de combate',rows:[['Resultado',roll.total],['Combatentes',members.length]],footnote:`${members.map(c=>c.name??c.actor?.name??'Combatente').join(', ')}. Priorize a situação ficcional; empate: d6 × d6 (LB p.65).`})});
  ui.combat?.render({force:true});return roll;
 }finally{rolling=false;}
}
export function addInitiativeButtons(app,element){
 const root=element instanceof HTMLElement?element:element?.[0];if(!root||root.querySelector('.d20age-initiative-tools'))return;
 const bar=document.createElement('div');bar.className='d20age-initiative-tools';bar.setAttribute('aria-label','Rolar iniciativa e incluir tokens no encontro');
 for(const [label,opts] of [['Grupo selecionado',{group:true}],...(game.user.isGM?[['Aventureiros',{group:true,side:'party'}],['Criaturas',{group:true,side:'foes'}]]:[])]){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=label==='Grupo selecionado'?'Selecione os tokens no mapa. Os que faltam entram no encontro.':'Inclui os tokens desta cena e registra uma rolagem para o lado.';b.addEventListener('click',async()=>{b.disabled=true;try{await rollInitiative(opts);}catch(e){ui.notifications.error(e.message);}finally{b.disabled=false;}});bar.append(b);}
 (root.querySelector('.combat-tracker-header')??root).prepend(bar);
}
export function registerInitiativeHooks(){
 const refresh=()=>{
  const actors=[...list(game.actors),...sceneTokens().map(t=>t.actor)];
  for(const actor of actors)for(const app of Object.values(actor.apps??{})){
   const output=app.element?.querySelector?.('.initiative-status');
   if(output)output.textContent=initiativeSummary(actor);
  }
 };
 for(const hook of ['createCombatant','updateCombatant','deleteCombatant','createCombat','updateCombat','deleteCombat'])Hooks.on(hook,refresh);
}

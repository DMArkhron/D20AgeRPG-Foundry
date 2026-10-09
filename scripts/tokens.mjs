export function roundTokenPath(image){
 const match=String(image??'').match(/^systems\/d20age\/assets\/(?:classes|icons)\/([^/?]+)\.(?:svg|png)(?:\?.*)?$/);
 if(match)return `systems/d20age/assets/tokens/${match[1]}.svg`;
 return image==='systems/d20age/assets/crest.svg'?'systems/d20age/assets/tokens/crest.svg':null;
}
export function prepareDefaultToken(actor,data){
 const image=data.img||'systems/d20age/assets/crest.svg',texture=data.prototypeToken?.texture?.src;
 const round=roundTokenPath(image);
 const updates={'prototypeToken.actorLink':data.prototypeToken?.actorLink??actor.type==='character','prototypeToken.bar1.attribute':data.prototypeToken?.bar1?.attribute??'hp'};
 if(round&&(!texture||texture===image||texture==='icons/svg/mystery-man.svg'))updates['prototypeToken.texture.src']=round;
 actor.updateSource(updates);
}
export async function migrateRoundTokens(){
 if(!game.user.isGM||(game.users?.activeGM&&game.users.activeGM.id!==game.user.id))return;
 for(const actor of game.actors??[]){const texture=actor.prototypeToken?.texture?.src,round=roundTokenPath(actor.img);if(round&&(!texture||texture===actor.img||texture==='icons/svg/mystery-man.svg'))await actor.update({'prototypeToken.texture.src':round});}
}
export function registerCreatureTokenRolls(){
 Hooks.on('createToken',(token,options,userId)=>{
  if(userId!==game.user.id||token.actorLink||token.actor?.type!=='creature'||token.actor.system.rollHPOnCreate===false||!token.actor.isOwner)return;
  token.actor.rollHitPoints({confirm:false,announce:false}).catch(error=>ui.notifications.warn(error.message));
 });
}

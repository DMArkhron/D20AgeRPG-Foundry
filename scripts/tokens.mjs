export function roundTokenPath(image){
 const creature=String(image??'').match(/^systems\/d20age\/assets\/creatures\/([a-f0-9]+)\.jpg(?:\?.*)?$/);
 if(creature)return `systems/d20age/assets/tokens/creatures/${creature[1]}.svg`;
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
 const stock=(texture,image)=>!texture||texture===image||texture==='icons/svg/mystery-man.svg'||/^systems\/d20age\/assets\/(?:icons|tokens)\//.test(texture);
 const actors=new Set(game.actors??[]);
 for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(!token.actorLink&&token.actor)actors.add(token.actor);
 for(const actor of actors){const texture=actor.prototypeToken?.texture?.src,round=roundTokenPath(actor.img);if(round&&texture!==round&&stock(texture,actor.img))await actor.update({'prototypeToken.texture.src':round});}
 for(const scene of game.scenes??[]){const updates=[];for(const token of scene.tokens??[]){const round=roundTokenPath(token.actor?.img),texture=token.texture?.src;if(round&&texture!==round&&stock(texture,token.actor?.img))updates.push({_id:token.id,'texture.src':round});}if(updates.length)await scene.updateEmbeddedDocuments('Token',updates);}
}
export function registerCreatureTokenRolls(){
 Hooks.on('createToken',(token,options,userId)=>{
  if(userId!==game.user.id||token.actorLink||token.actor?.type!=='creature'||token.actor.system.rollHPOnCreate===false||!token.actor.isOwner)return;
  token.actor.rollHitPoints({confirm:false,announce:false}).catch(error=>ui.notifications.warn(error.message));
 });
}

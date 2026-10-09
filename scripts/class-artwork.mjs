// Replace only paths belonging to the seven retired class SVGs.
const CLASS_IMAGE_PATTERN=/^systems\/d20age\/assets\/classes\/(arcanist|fighter|specialist|magist|dwarf|elf|gnome)\.svg(?:\?.*)?$/;
export function newClassImage(path){const match=String(path??'').match(CLASS_IMAGE_PATTERN);return match?`systems/d20age/assets/classes/${match[1]}.png`:null;}
export async function migrateClassArtwork(){
 if(!game.user.isGM || (game.users?.activeGM&&game.users.activeGM.id!==game.user.id))return;
 const actors=new Map();
 for(const actor of game.actors??[])actors.set(actor.uuid??actor.id,actor);
 for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid??token.actor.id,token.actor);
 for(const actor of actors.values()){
  const updates={};const portrait=newClassImage(actor.img),texture=newClassImage(actor.prototypeToken?.texture?.src);
  if(portrait)updates.img=portrait;if(texture)updates['prototypeToken.texture.src']=texture;
  if(Object.keys(updates).length)await actor.update(updates);
  const items=Array.from(actor.items??[]).map(item=>({_id:item.id,img:newClassImage(item.img)})).filter(item=>item.img);
  if(items.length)await actor.updateEmbeddedDocuments('Item',items);
 }
 for(const item of game.items??[]){const img=newClassImage(item.img);if(img)await item.update({img});}
 for(const scene of game.scenes??[]){const tokens=Array.from(scene.tokens??[]).map(token=>({_id:token.id,'texture.src':newClassImage(token.texture?.src)})).filter(token=>token['texture.src']);if(tokens.length)await scene.updateEmbeddedDocuments('Token',tokens);}
}

import {PACK_PROFILES} from './party-rules.mjs';
export const PACK_ANIMALS_COLLECTION='world.d20age-pack-animals';
let preparingAnimals;
export function packAnimalDocuments(book){
 return Object.entries(PACK_PROFILES).map(([profile,spec])=>{
  const original=book.find(a=>a.name.split('·')[0].trim().toLocaleLowerCase('pt-BR')===spec.label.toLocaleLowerCase('pt-BR'));
  if(!original)throw Error(`Animal não encontrado no bestiário: ${spec.label}.`);
  const doc=structuredClone(original);doc.folder=null;
  doc.flags??={};doc.flags.d20age??={};doc.flags.d20age.packAnimal={profile};
  doc.prototypeToken={...doc.prototypeToken,actorLink:true,disposition:1};return doc;
 });
}
export async function openPackAnimals(){
 if(!game.user.isGM)throw Error('O mestre adiciona os animais de carga.');
 if(!preparingAnimals)preparingAnimals=prepareAnimals().finally(()=>{preparingAnimals=undefined;});
 const pack=await preparingAnimals;
 pack.render(true);return pack;
}
async function prepareAnimals(){
 const response=await fetch('systems/d20age/content/bestiary.json');
 if(!response.ok)throw Error('Não foi possível ler o bestiário.');
 const docs=packAnimalDocuments(await response.json());
 let pack=game.packs.get(PACK_ANIMALS_COLLECTION);
 if(!pack)pack=await foundry.documents.collections.CompendiumCollection.createCompendium({name:'d20age-pack-animals',label:'D20Age · Bestas de carga',type:'Actor',package:'world',system:'d20age'});
 if(pack.documentName!=='Actor')throw Error('O compêndio de bestas de carga possui um tipo incompatível.');
 const folder=game.packs.get('world.d20age-bestiary')?.folder;
 if(folder)await pack.setFolder(folder.id??folder);
 const index=await pack.getIndex(),missing=docs.filter(d=>!index.has(d._id));
 if(missing.length){const locked=pack.locked;if(locked)await pack.configure({locked:false});
  try{await pack.documentClass.createDocuments(missing,{pack:pack.collection,keepId:true,keepEmbeddedIds:true});}
  finally{if(locked)await pack.configure({locked:true});}
 }
 return pack;
}

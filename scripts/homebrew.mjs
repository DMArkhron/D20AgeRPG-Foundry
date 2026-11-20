export const HOME_BREW_SOURCES={druid:'Druida v0.4',paladin:'Paladino v0.5',yogi:'Yogi v0.5'};
export const classAvailable=(id,enabled)=>enabled || !Object.hasOwn(HOME_BREW_SOURCES,id);
export function registerHomebrew(){
 game.settings.register('d20age','homebrew',{name:'Utilizar material homebrew',hint:'Libera Druida, Paladino e Yogi no gerador. Desativar não altera personagens existentes.',scope:'world',config:true,type:Boolean,default:false,requiresReload:true});
}
export async function installHomebrew(){
 if(!game.user.isGM || (game.users?.activeGM && game.users.activeGM.id!==game.user.id))return;
 const response=await fetch('systems/d20age/content/homebrew.json');
 if(!response.ok)throw new Error('Não foi possível carregar o compêndio Homebrew.');
 const docs=await response.json();
 const pack=game.packs.get('world.d20age-homebrew')??await foundry.documents.collections.CompendiumCollection.createCompendium({name:'d20age-homebrew',label:'D20Age · Homebrew',type:'JournalEntry',package:'world',system:'d20age'});
 const index=await pack.getIndex();
 const missing=docs.filter(doc=>!index.has(doc._id));
 if(!missing.length)return;
 const locked=pack.locked;
 if(locked)await pack.configure({locked:false});
 try{await pack.documentClass.createDocuments(missing,{pack:pack.collection,keepId:true,keepEmbeddedIds:true});}
 finally{if(locked)await pack.configure({locked:true});}
}

export function homebrewEnabled(){try{return globalThis.game?.settings?.get?.('d20age','homebrew')===true;}catch{return false;}}
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
 const existing=docs.filter(doc=>index.has(doc._id));
 const locked=pack.locked;
 if(locked)await pack.configure({locked:false});
 try{
  let classFolder=pack.folders?.get('d20ageClasses001');
  if(!classFolder&&globalThis.Folder?.createDocuments){[classFolder]=await Folder.createDocuments([{_id:'d20ageClasses001',name:'Classes',type:'JournalEntry',sorting:'a'}],{pack:pack.collection,keepId:true});}
  for(const source of docs)if(classFolder)source.folder=classFolder.id;
  if(missing.length)await pack.documentClass.createDocuments(missing,{pack:pack.collection,keepId:true,keepEmbeddedIds:true});
  for(const source of existing){
   const entry=await pack.getDocument(source._id);
   if((entry.flags?.d20age?.homebrewRevision??0)>=source.flags.d20age.homebrewRevision){if(classFolder&&entry.folder?.id!==classFolder.id)await entry.update({folder:classFolder.id});continue;}
   const managed=new Set(source.flags.d20age.managedPages);
   const obsolete=entry.pages.filter(p=>managed.has(p.id)&&!source.pages.some(s=>s._id===p.id)).map(p=>p.id);
   if(obsolete.length)await entry.deleteEmbeddedDocuments('JournalEntryPage',obsolete);
   const updates=source.pages.filter(p=>entry.pages.has(p._id));
   const additions=source.pages.filter(p=>!entry.pages.has(p._id));
   if(updates.length)await entry.updateEmbeddedDocuments('JournalEntryPage',updates);
   if(additions.length)await entry.createEmbeddedDocuments('JournalEntryPage',additions,{keepId:true});
   await entry.update({...(classFolder?{folder:classFolder.id}:{}),'flags.d20age.homebrewRevision':source.flags.d20age.homebrewRevision});
  }
 }
 finally{if(locked)await pack.configure({locked:true});}
}

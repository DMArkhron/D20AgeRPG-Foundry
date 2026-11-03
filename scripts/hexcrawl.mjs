import {escapeHTML} from './view.mjs';

export const HEXCRAWL_VERSION='1';
export const HEXCRAWL_COLLECTION='world.d20age-hexcrawl';
const TOOLS_COLLECTION='world.d20age-hexcrawl-tools';
const BASE='systems/d20age/assets/hexcrawl';
const TOOL_ID='d20ageHexAtlas01';
let installing;

export function registerHexcrawl(){
 game.settings.register('d20age','hexcrawlVersion',{scope:'world',config:false,type:String,default:''});
}

async function folder(key,name,parent=null){
 let existing=game.folders.find(f=>f.type==='Compendium' && f.getFlag('d20age','organizationKey')===key);
 if(!existing)existing=await Folder.create({name,type:'Compendium',folder:parent,sorting:'a',color:'#373737',flags:{d20age:{organizationKey:key}}});
 return existing;
}

async function pack(name,label,type,sidebarFolder){
 const collection=`world.${name}`;
 let result=game.packs.get(collection);
 if(!result)result=await foundry.documents.collections.CompendiumCollection.createCompendium({name,label,type,package:'world',system:'d20age'});
 if(result.documentName!==type)throw new Error(`Compêndio ${label} possui outro tipo de documento.`);
 await result.setFolder(sidebarFolder.id);
 return result;
}

export async function installHexcrawl({force=false}={}){
 if(!game.user?.isGM)return;
 if(game.users?.activeGM && game.users.activeGM.id!==game.user.id)return;
 if(installing)return installing;
 if(!force && game.settings.get('d20age','hexcrawlVersion')===HEXCRAWL_VERSION
    && game.packs.get(HEXCRAWL_COLLECTION) && game.packs.get(TOOLS_COLLECTION))return;
 installing=performInstall();
 try{return await installing;}finally{installing=undefined;}
}

async function performInstall(){
 const response=await fetch('systems/d20age/content/hexcrawl.json');
 if(!response.ok)throw new Error('Não foi possível carregar o atlas de Hexcrawl.');
 const docs=await response.json();
 if(!Array.isArray(docs) || docs.length!==27 || new Set(docs.map(d=>d._id)).size!==27
    || docs.some(d=>d.pages?.length!==2 || d.pages.some(p=>!p.src?.startsWith(BASE+'/'))))throw new Error('Atlas de Hexcrawl incompleto.');
 const root=await folder('d20age-root','D20Age RPG');
 const sidebar=await folder('d20age-hexcrawl','Hexcrawl',root.id);
 const atlas=await pack('d20age-hexcrawl','D20Age · Atlas de Hexcrawl','JournalEntry',sidebar);
 const tools=await pack('d20age-hexcrawl-tools','D20Age · Ferramentas de Hexcrawl','Macro',sidebar);
 const wasLocked=atlas.locked;
 if(wasLocked)await atlas.configure({locked:false});
 try{
  const categories=[...new Set(docs.map(d=>d.flags.d20age.category))];
  for(const category of categories){
   const id=docs.find(d=>d.flags.d20age.category===category)._id;
   if(!atlas.folders.has(id))await Folder.createDocuments([{_id:id,name:category,type:'JournalEntry',folder:null,sorting:'a',color:'#373737',flags:{d20age:{hexcrawlCategory:category}}}],{pack:atlas.collection,keepId:true});
  }
  const index=await atlas.getIndex({fields:['folder','img','flags.d20age.assetVersion']});
  const missing=docs.filter(d=>!index.has(d._id)).map(d=>({...d,folder:docs.find(v=>v.flags.d20age.category===d.flags.d20age.category)._id}));
  for(let i=0;i<missing.length;i+=25)await atlas.documentClass.createDocuments(missing.slice(i,i+25),{pack:atlas.collection,keepId:true,keepEmbeddedIds:true});
  for(const doc of docs){
   if(!index.has(doc._id))continue;
   const existing=await atlas.getDocument(doc._id);
   if(existing.flags?.d20age?.assetVersion===HEXCRAWL_VERSION)continue;
   const updates=[];
   const additions=[];
   for(const page of doc.pages){
    const old=existing.pages.get(page._id);
    if(!old)additions.push(page);
    else if(!old.src || old.src.startsWith(BASE+'/'))updates.push({_id:page._id,src:page.src});
   }
   if(additions.length)await existing.createEmbeddedDocuments('JournalEntryPage',additions,{keepId:true});
   if(updates.length)await existing.updateEmbeddedDocuments('JournalEntryPage',updates);
   await existing.update({'flags.d20age.assetVersion':HEXCRAWL_VERSION});
  }
 }finally{if(wasLocked)await atlas.configure({locked:true});}
 const macro={_id:TOOL_ID,name:'Abrir atlas de Hexcrawl',type:'script',scope:'global',img:`${BASE}/color/floresta.jpg`,
  command:'await game.d20age.openHexcrawlAtlas();',flags:{d20age:{hexcrawlTool:true,assetVersion:HEXCRAWL_VERSION}}};
 const toolsLocked=tools.locked;
 if(toolsLocked)await tools.configure({locked:false});
 try{
  const index=await tools.getIndex();
  if(!index.has(TOOL_ID))await tools.documentClass.createDocuments([macro],{pack:tools.collection,keepId:true});
  else {const old=await tools.getDocument(TOOL_ID);if(old.flags?.d20age?.hexcrawlTool)await old.update({command:macro.command,img:macro.img,'flags.d20age.assetVersion':HEXCRAWL_VERSION});}
 }finally{if(toolsLocked)await tools.configure({locked:true});}
 await game.settings.set('d20age','hexcrawlVersion',HEXCRAWL_VERSION);
 ui.notifications.info('D20Age · Atlas de Hexcrawl preparado nos Compêndios.');
 return {icons:docs.length,atlas:atlas.collection,tools:tools.collection};
}

export function tileData({slug,variant,x,y,size,gridSize}){
 if(!/^[a-z]+$/.test(slug) || !['color','bw'].includes(variant))throw new Error('Ícone de Hexcrawl inválido.');
 const pixels=Math.max(1,Number(size)||2)*Math.max(1,Number(gridSize)||100);
 return {texture:{src:`${BASE}/${variant}/${slug}.jpg`},x:Math.round(x-pixels/2),y:Math.round(y-pixels/2),width:pixels,height:pixels,
  hidden:false,overhead:false,flags:{d20age:{hexcrawl:slug,variant}}};
}

export async function openHexcrawlAtlas(){
 if(!game.user?.isGM){ui.notifications.warn('Somente o mestre pode colocar ícones na cena.');return;}
 if(!canvas?.scene){ui.notifications.warn('Abra uma cena antes de usar o atlas.');return;}
 const pack=game.packs.get(HEXCRAWL_COLLECTION);
 if(!pack)throw new Error('Atlas indisponível. Execute a preparação de compêndios como mestre.');
 const response=await fetch('systems/d20age/content/hexcrawl.json');
 if(!response.ok)throw new Error('Não foi possível ler o catálogo de Hexcrawl.');
 const docs=await response.json();
 const options=docs.map((doc,i)=>`<label class="d20age-hex-choice"><input type="radio" name="hexIcon" value="${escapeHTML(doc.flags.d20age.hexcrawl)}" ${i===0?'checked':''}><img src="${escapeHTML(doc.img)}" alt=""><span>${escapeHTML(doc.name)}</span></label>`).join('');
 const selection=await foundry.applications.api.DialogV2.prompt({window:{title:'D20Age · Atlas de Hexcrawl'},classes:['d20age-tool-dialog','d20age-hex-dialog'],rejectClose:false,
  content:`<p>Escolha um ícone e clique no ponto da cena onde deseja colocá-lo. Ele será um Tile independente, sem Ator.</p><div class="d20age-hex-gallery">${options}</div><div class="d20age-hex-options"><label>Estilo<select name="hexVariant"><option value="color">Colorido</option><option value="bw">Preto e branco</option></select></label><label>Tamanho<select name="hexSize"><option value="1">1 célula</option><option value="2" selected>2 células</option><option value="3">3 células</option><option value="4">4 células</option></select></label></div>`,
  ok:{label:'Colocar na cena',callback:(event,button)=>({slug:button.form.elements.hexIcon.value,variant:button.form.elements.hexVariant.value,size:Number(button.form.elements.hexSize.value)})}});
 if(!selection)return;
 const stage=canvas.stage,scene=canvas.scene;
 ui.notifications.info('Clique na cena para posicionar o ícone. Esc cancela.');
 const cancel=(event)=>{if(event.key==='Escape'){cleanup();ui.notifications.info('Posicionamento cancelado.');}};
 const cleanup=()=>{stage.off('pointerdown',onClick);window.removeEventListener('keydown',cancel);};
 const onClick=async event=>{
  if(event.button!==0)return;
  cleanup();
  if(canvas.scene!==scene){ui.notifications.warn('A cena mudou. Abra o atlas novamente.');return;}
  const point=stage.toLocal(event.global);
  try{await scene.createEmbeddedDocuments('Tile',[tileData({...selection,x:point.x,y:point.y,gridSize:scene.grid?.size??canvas.grid?.size??100})]);
   ui.notifications.info('Ícone adicionado como Tile. Use a ferramenta Tiles para mover ou redimensionar.');
  }catch(error){console.error('D20Age · Hexcrawl',error);ui.notifications.error('Falha ao colocar o ícone: '+error.message);}
 };
 stage.on('pointerdown',onClick);window.addEventListener('keydown',cancel);
}

import {escapeHTML} from './view.mjs';

export const HEXCRAWL_VERSION='2';
const BASE='systems/d20age/assets/hexcrawl';
let installing;

export function registerHexcrawl(){
 game.settings.register('d20age','hexcrawlVersion',{scope:'world',config:false,type:String,default:''});
 Hooks.on('renderSceneDirectory',addHexcrawlSceneButton);
}

export function addHexcrawlSceneButton(app,element){
 if(!game.user?.isGM)return;
 const root=element instanceof HTMLElement?element:element?.[0];
 if(!root || root.querySelector('[data-d20age-hexcrawl]'))return;
 const button=document.createElement('button');
 button.type='button';button.dataset.d20ageHexcrawl='true';
 button.innerHTML='<i class="fa-solid fa-map" aria-hidden="true"></i> Atlas de Hexcrawl';
 button.addEventListener('click',()=>openHexcrawlAtlas().catch(error=>{console.error('D20Age · Hexcrawl',error);ui.notifications.error(error.message)}));
 (root.querySelector('.directory-header .header-actions')||root.querySelector('.directory-header')||root).append(button);
}

export async function installHexcrawl(){
 if(!game.user?.isGM)return;
 if(game.users?.activeGM && game.users.activeGM.id!==game.user.id)return;
 if(installing)return installing;
 if(game.settings.get('d20age','hexcrawlVersion')===HEXCRAWL_VERSION)return;
 installing=(async()=>{
  // Remove somente compêndios gerados pela versão antiga, sem apagar entradas adicionadas pelo mestre.
  for(const collection of ['world.d20age-hexcrawl','world.d20age-hexcrawl-tools']){
   const pack=game.packs.get(collection);
   if(!pack)continue;
   const index=await pack.getIndex({fields:['flags.d20age.hexcrawl','flags.d20age.hexcrawlTool']});
   const owned=[...index].every(entry=>entry.flags?.d20age?.hexcrawl || entry.flags?.d20age?.hexcrawlTool);
   if(owned && typeof pack.deleteCompendium==='function')await pack.deleteCompendium();
   else if(!owned)ui.notifications.warn(`O compêndio ${pack.title} contém registros próprios; remova-o manualmente se desejar.`);
  }
  await game.settings.set('d20age','hexcrawlVersion',HEXCRAWL_VERSION);
 })();
 try{return await installing;}finally{installing=undefined;}
}

export function tileData({slug,variant,x,y,gridSize,gridWidth=gridSize,gridHeight=gridSize}){
 if(!/^[a-z]+$/.test(slug) || !['color','bw'].includes(variant))throw new Error('Ícone de Hexcrawl inválido.');
 const width=Math.max(1,Number(gridWidth)||100);
 const height=Math.max(1,Number(gridHeight)||100);
 return {texture:{src:`${BASE}/${variant}/${slug}.png`},x:Math.round(x-width/2),y:Math.round(y-height/2),width,height,
  hidden:false,overhead:false,flags:{d20age:{hexcrawl:slug,variant}}};
}

export function tileAtPoint({slug,variant,point,grid}){
 if(!grid || typeof grid.getCenterPoint!=='function')throw new Error('A grade da cena não está disponível. Reabra a cena e tente novamente.');
 const center=grid.getCenterPoint(point);
 return tileData({slug,variant,x:center.x,y:center.y,gridSize:grid.size,gridWidth:grid.sizeX,gridHeight:grid.sizeY});
}

export async function openHexcrawlAtlas(){
 if(!game.user?.isGM){ui.notifications.warn('Somente o mestre pode colocar ícones na cena.');return;}
 if(!canvas?.scene){ui.notifications.warn('Abra uma cena antes de usar o atlas.');return;}
 const response=await fetch('systems/d20age/content/hexcrawl.json');
 if(!response.ok)throw new Error('Não foi possível ler o catálogo de Hexcrawl.');
 const docs=await response.json();
 const options=docs.map((doc,i)=>`<label class="d20age-hex-choice"><input type="radio" name="hexIcon" value="${escapeHTML(doc.flags.d20age.hexcrawl)}" ${i===0?'checked':''}><img src="${escapeHTML(doc.img)}" alt=""><span>${escapeHTML(doc.name)}</span></label>`).join('');
 const selection=await foundry.applications.api.DialogV2.prompt({window:{title:'D20Age · Atlas de Hexcrawl'},classes:['d20age-tool-dialog','d20age-hex-dialog'],rejectClose:false,
  content:`<p>Escolha um ícone. Ele ocupará exatamente uma célula hexagonal como Tile independente.</p><div class="d20age-hex-gallery">${options}</div><div class="d20age-hex-options"><label>Estilo<select name="hexVariant"><option value="color">Colorido</option><option value="bw">Preto e branco</option></select></label></div>`,
  ok:{label:'Colocar na cena',callback:(event,button)=>({slug:button.form.elements.hexIcon.value,variant:button.form.elements.hexVariant.value})}});
 if(!selection)return;
 const stage=canvas.stage,scene=canvas.scene;
 ui.notifications.info('Clique no hexágono da cena para posicionar o ícone. Esc cancela.');
 const cancel=(event)=>{if(event.key==='Escape'){cleanup();ui.notifications.info('Posicionamento cancelado.');}};
 const cleanup=()=>{stage.off('pointerdown',onClick);window.removeEventListener('keydown',cancel);};
 const onClick=async event=>{
  if(event.button!==0)return;
  cleanup();
  if(canvas.scene!==scene){ui.notifications.warn('A cena mudou. Abra o atlas novamente.');return;}
  const point=stage.toLocal(event.global);
  try{
   // Em V13/V14 canvas.grid já é a instância BaseGrid, sem propriedade .grid.
   await scene.createEmbeddedDocuments('Tile',[tileAtPoint({...selection,point,grid:canvas.grid??scene.grid})]);
   ui.notifications.info('Ícone adicionado em uma célula. Use a ferramenta Tiles para movê-lo.');
  }catch(error){console.error('D20Age · Hexcrawl',error);ui.notifications.error('Falha ao colocar o ícone: '+error.message);}
 };
 stage.on('pointerdown',onClick);window.addEventListener('keydown',cancel);
}

import {tilePlacement,dungeonLayer} from './dungeon.mjs';
const BASE='systems/d20age';
export function exportTileData(tile,p,origin,size,src,saveId){
 tilePlacement(tile,p.x,p.y,p.rotation,p.variant);
 if(!Number.isFinite(size)||size<=0)throw Error('Grid inválido.');
 const width=tile.gridWidth*size,height=tile.gridHeight*size,swap=p.rotation%180!==0;
 return {texture:{src},x:origin.x+p.x*size+(swap?(height-width)/2:0),y:origin.y+p.y*size+(swap?(width-height)/2:0),width,height,rotation:p.rotation,hidden:false,sort:dungeonLayer(tile)*100000,flags:{d20age:{dungeonAtlas:saveId,dungeonLayer:dungeonLayer(tile)}}};
}
const atlasImages=new Map();
async function imageFor(variant){
 if(!atlasImages.has(variant))atlasImages.set(variant,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Não foi possível carregar a textura.'));im.src=BASE+'/assets/dungeon/'+variant+'.png';}).catch(e=>{atlasImages.delete(variant);throw e;}));
 return atlasImages.get(variant);
}
async function prepareTextures(pieces,catalog){
 const picker=foundry.applications.apps.FilePicker;
 const dir='d20age-dungeon-tiles-v3';
 let listing;
 try{listing=await picker.browse('data',dir);}catch{}
 if(!listing||listing.target!==dir){try{await picker.createDirectory('data',dir);}catch{}listing=await picker.browse('data',dir);}
 const result=new Map();
 for(const p of pieces){
  const key=p.variant+'-'+p.tile;if(result.has(key))continue;
  const path=dir+'/'+key+'.png';
  if(listing.files?.includes(path)){result.set(key,path);continue;}
  const t=catalog.find(t=>t.id===p.tile),im=await imageFor(p.variant);
  const c=document.createElement('canvas');c.width=t.sw;c.height=t.sh;c.getContext('2d').drawImage(im,t.sx,t.sy,t.sw,t.sh,0,0,t.sw,t.sh);
  const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Falha ao preparar textura.')),'image/png'));
  const saved=await picker.upload('data',dir,new File([blob],key+'.png',{type:'image/png'}),{},{notify:false});
  if(!saved?.path)throw Error('Falha ao salvar textura de '+key+'. Confira as permissões de arquivos.');
  result.set(key,saved.path);
 }
 return result;
}
let cancelPending;
export async function beginDungeonExport(saved,catalog){
 if(!game.user.isGM)throw Error('Somente o mestre pode exportar Tiles.');
 const scene=canvas.scene,grid=canvas.grid;
 if(!scene||scene.grid.type!==CONST.GRID_TYPES.SQUARE||!grid?.getTopLeftPoint)throw Error('Abra uma cena com grid quadrado para exportar.');
 const pieces=Object.values(saved.pieces??{});if(!pieces.length)throw Error('O mapa salvo está vazio.');
 if(pieces.length>2000)throw Error('Mapa excede o limite de 2000 peças.');
 for(const p of pieces)tilePlacement(catalog.find(t=>t.id===p.tile),p.x,p.y,p.rotation,p.variant);
 const minX=Math.min(...pieces.map(p=>p.x)),minY=Math.min(...pieces.map(p=>p.y));
 const normalized=pieces.map(p=>({...p,x:p.x-minX,y:p.y-minY}));
 const textures=await prepareTextures(normalized,catalog);
 if(canvas.scene!==scene)throw Error('A cena mudou durante a preparação.');
 cancelPending?.();const stage=canvas.stage;
 const cleanup=()=>{stage.off('pointerdown',click);window.removeEventListener('keydown',key);cancelPending=null;};
 const key=e=>{if(e.key==='Escape'){cleanup();ui.notifications.info('Exportação cancelada.');}};
 const click=async e=>{if(e.button!==0)return;cleanup();
  try{
   if(canvas.scene!==scene)throw Error('A cena mudou. Abra novamente o atlas.');
   const origin=grid.getTopLeftPoint(stage.toLocal(e.global));const size=grid.size;
   const rect=canvas.dimensions?.sceneRect;
   if(rect&&normalized.some(p=>{const t=catalog.find(t=>t.id===p.tile),swap=p.rotation%180!==0;return origin.x+p.x*size<rect.x||origin.y+p.y*size<rect.y||origin.x+(p.x+(swap?t.gridHeight:t.gridWidth))*size>rect.x+rect.width||origin.y+(p.y+(swap?t.gridWidth:t.gridHeight))*size>rect.y+rect.height;}))throw Error('O mapa não cabe nessa posição. Escolha outra origem.');
   const data=normalized.sort((a,b)=>dungeonLayer(catalog.find(t=>t.id===a.tile))-dungeonLayer(catalog.find(t=>t.id===b.tile))).map((p,i)=>{const d=exportTileData(catalog.find(t=>t.id===p.tile),p,origin,size,textures.get(p.variant+'-'+p.tile),saved.id);return {...d,sort:d.sort+i};});
   await scene.createEmbeddedDocuments('Tile',data);ui.notifications.info(data.length+' Tiles adicionados à cena.');
  }catch(err){ui.notifications.error(err.message);}
 };
 cancelPending=cleanup;stage.on('pointerdown',click);window.addEventListener('keydown',key);
 ui.notifications.info('Clique na célula inicial do mapa na cena. Esc cancela.');
}

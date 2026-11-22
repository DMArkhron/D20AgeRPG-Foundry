import {escapeHTML as esc} from './view.mjs';
const SIZE=40, COLS=36, ROWS=28, BASE='systems/d20age';
let app, catalogPromise;
const getDocument=()=>game.journal?.find(d=>d.getFlag('d20age','dungeonAtlas')===true);
export async function ensureDungeonAtlas(){
 if(getDocument()||!game.user.isGM||(game.users?.activeGM&&game.users.activeGM.id!==game.user.id))return getDocument();
 return JournalEntry.create({name:'D20Age · Atlas de Masmorras (cartografia dos jogadores)',ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER},flags:{d20age:{dungeonAtlas:true,maps:{}}}});
}
function loadCatalog(){return catalogPromise??=fetch(BASE+'/content/dungeon.json').then(r=>{if(!r.ok)throw Error('Catálogo indisponível.');return r.json()}).catch(e=>{catalogPromise=null;throw e;});}
export function tilePlacement(tile,x,y,rotation=0,variant='bw'){
 if(!tile||!['bw','color'].includes(variant)||![0,90,180,270].includes(rotation)||!Number.isInteger(x)||!Number.isInteger(y))throw Error('Peça inválida.');
 const swap=rotation%180!==0,w=swap?tile.gridHeight:tile.gridWidth,h=swap?tile.gridWidth:tile.gridHeight;
 if(x<0||y<0||x+w>COLS||y+h>ROWS)throw Error('A peça ultrapassa os limites do mapa.');
 return {tile:tile.id,x,y,rotation,variant};
}
function texture(t,variant,scale=1){
 const width=t.gridWidth*SIZE*scale,height=t.gridHeight*SIZE*scale;
 return `width:${width}px;height:${height}px;background-image:url('${BASE}/assets/dungeon/${variant}.png');background-size:${t.atlasWidth/128*SIZE*scale}px ${t.atlasHeight/128*SIZE*scale}px;background-position:-${t.sx/128*SIZE*scale}px -${t.sy/128*SIZE*scale}px`;
}
const {ApplicationV2}=foundry.applications.api;
export class DungeonAtlas extends ApplicationV2 {
 static DEFAULT_OPTIONS={classes:['d20age-dungeon-app'],tag:'div',position:{width:1050,height:800},window:{title:'D20Age · Atlas de Masmorras',resizable:true}};
 constructor(options={}){super(options);this.variant='bw';this.rotation=0;this.category='paredes-retas';this.mode='place';this.selected='p1';}
 async _prepareContext(){const doc=getDocument(),scene=canvas.scene;return {doc,scene,catalog:await loadCatalog(),editable:!!doc?.isOwner,placements:scene?doc?.getFlag('d20age','maps')?.[scene.id]?.pieces??{}:{}};}
 async _renderHTML(c){
  const tpl=document.createElement('template');this.context=c;
  const options=c.catalog.filter(t=>t.file.startsWith(this.category+'/')&&t.file!=='paredes-retas/parede-vazio.svg');
  const pieces=Object.entries(c.placements).map(([id,p])=>{const t=c.catalog.find(t=>t.id===p.tile);if(!t||!['bw','color'].includes(p.variant)||![0,90,180,270].includes(p.rotation))return '';try{tilePlacement(t,p.x,p.y,p.rotation,p.variant)}catch{return ''}const swap=p.rotation%180!==0,w=(swap?t.gridHeight:t.gridWidth)*SIZE,h=(swap?t.gridWidth:t.gridHeight)*SIZE;return `<div class="d20-dungeon-piece" data-piece="${esc(id)}" style="left:${p.x*SIZE}px;top:${p.y*SIZE}px;width:${w}px;height:${h}px"><span style="${texture(t,p.variant)};transform:translate(-50%,-50%) rotate(${p.rotation}deg)"></span></div>`}).join('');
  tpl.innerHTML=`<section class="d20-dungeon"><header><strong>${esc(c.scene?.name??'Nenhuma cena aberta')}</strong><span>Mapa dos aventureiros · 36 × 28 células</span></header><div class="d20-dungeon-tools"><label>Peças <select data-select="category">${[['paredes-retas','Paredes retas'],['paredes-curvas','Paredes curvas'],['escadas','Escadas']].map(([v,l])=>`<option value="${v}" ${v===this.category?'selected':''}>${l}</option>`).join('')}</select></label><label>Estilo <select data-select="variant"><option value="bw" ${this.variant==='bw'?'selected':''}>Preto e branco</option><option value="color" ${this.variant==='color'?'selected':''}>Colorido</option></select></label><button type="button" data-command="rotate">Girar ${this.rotation}°</button><button type="button" data-command="erase">${this.mode==='erase'?'Apagar ativo':'Apagar'}</button></div><div class="d20-dungeon-layout"><aside>${options.map(t=>`<button type="button" data-tile="${t.id}" class="${t.id===this.selected?'selected':''}"><span style="${texture(t,this.variant,Math.min(1,2/Math.max(t.gridWidth,t.gridHeight)))}"></span><small>${esc(t.label)} · ${t.gridWidth}×${t.gridHeight}</small></button>`).join('')}</aside><div class="d20-dungeon-scroll"><div class="d20-dungeon-grid" style="width:${COLS*SIZE}px;height:${ROWS*SIZE}px">${pieces}</div></div></div><footer>${c.editable?'Escolha uma peça e clique no mapa. Para apagar, ative Apagar e clique na peça.':'O mestre deve abrir o mundo e autorizar a edição do diário de cartografia.'} · O mapa não interfere na cena real.</footer></section>`;return tpl.content;
 }
 _replaceHTML(result,content){const old=content.querySelector('.d20-dungeon-scroll'),left=old?.scrollLeft??0,top=old?.scrollTop??0;content.replaceChildren(result);const next=content.querySelector('.d20-dungeon-scroll');if(next){next.scrollLeft=left;next.scrollTop=top;}}
 async _onRender(context,options){
  await super._onRender(context,options);const root=this.element;
  root.querySelectorAll('[data-select]').forEach(e=>e.addEventListener('change',()=>{this[e.dataset.select]=e.value;if(e.dataset.select==='category')this.selected=this.context.catalog.find(t=>t.file.startsWith(this.category+'/')&&!t.file.endsWith('vazio.svg'))?.id;this.render({force:true});}));
  root.querySelectorAll('[data-tile]').forEach(e=>e.addEventListener('click',()=>{this.selected=e.dataset.tile;this.mode='place';this.render({force:true});}));
  root.querySelector('[data-command=rotate]').addEventListener('click',()=>{this.rotation=(this.rotation+90)%360;this.render({force:true});});
  root.querySelector('[data-command=erase]').addEventListener('click',()=>{this.mode=this.mode==='erase'?'place':'erase';this.render({force:true});});
  const grid=root.querySelector('.d20-dungeon-grid');
  grid.addEventListener('click',async e=>{if(this.busy)return;this.busy=true;try{
   const doc=getDocument(),scene=canvas.scene;if(!doc?.isOwner||!scene||scene.id!==this.context.scene?.id)throw Error('Mapa indisponível ou sem permissão.');
   const prefix='flags.d20age.maps.'+scene.id+'.pieces.';
   if(this.mode==='erase'){const id=e.target.closest('[data-piece]')?.dataset.piece;if(id&&Object.hasOwn(doc.getFlag('d20age','maps')?.[scene.id]?.pieces??{},id))await doc.update({[prefix+'-='+id]:null});}
   else{const r=grid.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/SIZE),y=Math.floor((e.clientY-r.top)/SIZE),tile=this.context.catalog.find(t=>t.id===this.selected);const p=tilePlacement(tile,x,y,this.rotation,this.variant);await doc.update({[prefix+foundry.utils.randomID()]:p});}
   await this.render({force:true});
  }catch(err){ui.notifications.warn(err.message)}finally{this.busy=false;}});
 }
}
export async function openDungeonAtlas(){if(game.user.isGM)await ensureDungeonAtlas();app??=new DungeonAtlas();return app.render({force:true});}
export function addDungeonControl(controls){const notes=controls.notes;if(!notes?.tools)return;notes.tools.d20ageDungeon={name:'d20ageDungeon',title:'D20Age · Atlas de Masmorras',icon:'fa-solid fa-dungeon',order:Math.max(-1,...Object.values(notes.tools).map(t=>Number(t.order)||0))+1,button:true,visible:true,onChange:()=>openDungeonAtlas().catch(e=>ui.notifications.error(e.message))};}
export function registerDungeon(){Hooks.on('getSceneControlButtons',addDungeonControl);Hooks.once('ready',()=>ensureDungeonAtlas().catch(e=>console.error('D20Age · Masmorras',e)));Hooks.on('updateJournalEntry',doc=>{if(doc.getFlag('d20age','dungeonAtlas')&&app?.rendered&&!app.busy)app.render({force:true});});Hooks.on('canvasReady',()=>{if(app?.rendered)app.render({force:true});});}

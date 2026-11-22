import {escapeHTML as esc} from './view.mjs';
const SIZE=40, COLS=36, ROWS=28, BASE='systems/d20age';
let app, catalogPromise;
const getDocument=()=>game.journal?.find(d=>d.getFlag('d20age','dungeonAtlas')===true);
export async function ensureDungeonAtlas(){
 if(getDocument()||!game.user.isGM||(game.users?.activeGM&&game.users.activeGM.id!==game.user.id))return getDocument();
 return JournalEntry.create({name:'D20Age · Atlas de Masmorras (cartografia dos jogadores)',ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER},flags:{d20age:{dungeonAtlas:true,maps:{}}}});
}
function loadCatalog(){return catalogPromise??=Promise.all(['dungeon','dungeon-openings','dungeon-extra'].map(name=>fetch(BASE+'/content/'+name+'.json').then(r=>{if(!r.ok)throw Error('Catálogo indisponível.');return r.json()}))).then(parts=>parts.flat()).catch(e=>{catalogPromise=null;throw e;});}
export function dungeonLayer(tile){const file=tile?.file??'';return file.startsWith('escadas/')?1:file.startsWith('aberturas/')?3:2;}
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
 constructor(options={}){super(options);this.variant='bw';this.rotation=0;this.category='paredes-retas';this.mode='place';this.selected='p1';this.zoom=1;this.savedId='';}
 async _prepareContext(){const doc=getDocument(),scene=canvas.scene;return {doc,scene,catalog:await loadCatalog(),editable:!!doc?.isOwner,saved:doc?.getFlag('d20age','savedDungeons')??{},placements:this.savedId?(doc?.getFlag('d20age','savedDungeons')?.[this.savedId]?.pieces??{}):(scene?doc?.getFlag('d20age','maps')?.[scene.id]?.pieces??{}:{})};}
 async _renderHTML(c){
  const tpl=document.createElement('template');this.context=c;const cell=SIZE*this.zoom;const selected=c.catalog.find(t=>t.id===this.selected);
  const options=c.catalog.filter(t=>t.file.startsWith(this.category+'/')&&t.file!=='paredes-retas/parede-vazio.svg');
  const pieces=Object.entries(c.placements).sort(([,a],[,b])=>dungeonLayer(c.catalog.find(t=>t.id===a.tile))-dungeonLayer(c.catalog.find(t=>t.id===b.tile))).map(([id,p])=>{const t=c.catalog.find(t=>t.id===p.tile);if(!t||!['bw','color'].includes(p.variant)||![0,90,180,270].includes(p.rotation))return '';try{tilePlacement(t,p.x,p.y,p.rotation,p.variant)}catch{return ''}const swap=p.rotation%180!==0,w=(swap?t.gridHeight:t.gridWidth)*cell,h=(swap?t.gridWidth:t.gridHeight)*cell;return `<div class="d20-dungeon-piece" data-piece="${esc(id)}" style="left:${p.x*cell}px;top:${p.y*cell}px;width:${w}px;height:${h}px"><span style="${texture(t,p.variant,this.zoom)};transform:translate(-50%,-50%) rotate(${p.rotation}deg)"></span></div>`}).join('');
  tpl.innerHTML=`<section class="d20-dungeon"><header><strong>${esc(c.scene?.name??'Nenhuma cena aberta')}</strong><span>Mapa dos aventureiros · 36 × 28 células</span></header><div class="d20-dungeon-saves"><label>Mapas <select data-select="savedId"><option value="">Rascunho da cena</option>${Object.entries(c.saved).map(([id,m])=>`<option value="${esc(id)}" ${id===this.savedId?'selected':''}>${esc(m.name)} (${Object.keys(m.pieces??{}).length} peças)</option>`).join('')}</select></label><button type="button" data-command="save" ${!c.editable||this.savedId?'disabled':''}><i class="fa-solid fa-floppy-disk"></i> Salvar mapa</button><button type="button" data-command="resume" ${!c.editable||!this.savedId?"disabled":""}>Retomar edição</button><button type="button" data-command="delete" ${!c.editable||!this.savedId?"disabled":""}><i class="fa-solid fa-trash"></i> Excluir mapa</button>${game.user.isGM?`<button type="button" data-command="export" ${this.savedId?'':'disabled'}><i class="fa-solid fa-map"></i> Exportar para cena</button>`:''}</div><div class="d20-dungeon-tools"><label>Peças <select data-select="category">${[['paredes-retas','Paredes retas'],['paredes-curvas','Paredes curvas'],['quinas','Quinas'],['escadas','Escadas'],['aberturas','Portas e janelas']].map(([v,l])=>`<option value="${v}" ${v===this.category?'selected':''}>${l}</option>`).join('')}</select></label><label>Estilo <select data-select="variant"><option value="bw" ${this.variant==='bw'?'selected':''}>Preto e branco</option><option value="color" ${this.variant==='color'?'selected':''}>Colorido</option></select></label><button type="button" data-command="draw" aria-pressed="${this.mode==='place'}"><i class="fa-solid fa-pencil"></i> Desenhar</button><button type="button" data-command="erase" aria-pressed="${this.mode==='erase'}"><i class="fa-solid fa-eraser"></i> Apagar</button><button type="button" data-command="rotate" title="Gira a próxima peça em 90 graus"><i class="fa-solid fa-rotate-right"></i> Girar 90°</button><span class="d20-dungeon-angle">${this.rotation}°</span><div class="d20-dungeon-zoom"><button type="button" data-command="zoom-out" title="Diminuir zoom">−</button><output>${Math.round(this.zoom*100)}%</output><button type="button" data-command="zoom-in" title="Aumentar zoom">+</button><button type="button" data-command="zoom-reset">100%</button></div></div><div class="d20-dungeon-layout"><aside><div class="d20-dungeon-selection"><b>Peça selecionada</b>${selected?`<div class="d20-dungeon-rotation-preview"><span style="${texture(selected,this.variant,Math.min(1,1.1/Math.max(selected.gridWidth,selected.gridHeight)))};transform:rotate(${this.rotation}deg)"></span></div><small>${esc(selected.label)} · ${this.rotation}°</small>`:''}</div>${options.map(t=>`<button type="button" data-tile="${t.id}" class="${t.id===this.selected?'selected':''}"><div class="d20-dungeon-thumb"><span style="${texture(t,this.variant,Math.min(1,1.15/Math.max(t.gridWidth,t.gridHeight)))}"></span></div><small>${esc(t.label)}${t.label.includes("×")?"": " · "+t.gridWidth+"×"+t.gridHeight}</small></button>`).join('')}</aside><div class="d20-dungeon-scroll"><div class="d20-dungeon-grid" style="width:${COLS*cell}px;height:${ROWS*cell}px;background-size:${cell}px ${cell}px">${pieces}</div></div></div><footer>${this.savedId?'Mapa salvo · somente leitura. O mestre pode exportá-lo para uma cena quadrada.':c.editable?(this.mode==='erase'?'Modo Apagar: clique em uma peça para removê-la.':'Modo Desenhar: selecione uma peça e clique na célula inicial. Girar altera a próxima peça.'):'O mestre deve autorizar a edição do diário.'} · O mapa não interfere na cena real.</footer></section>`;return tpl.content;
 }
 _replaceHTML(result,content){const old=content.querySelector('.d20-dungeon-scroll'),left=old?.scrollLeft??0,top=old?.scrollTop??0;content.replaceChildren(result);const next=content.querySelector('.d20-dungeon-scroll');if(next){next.scrollLeft=left;next.scrollTop=top;}}
 async _onRender(context,options){
  await super._onRender(context,options);const root=this.element;
  root.querySelectorAll('[data-select]').forEach(e=>e.addEventListener('change',()=>{this[e.dataset.select]=e.value;if(e.dataset.select==='category')this.selected=this.context.catalog.find(t=>t.file.startsWith(this.category+'/')&&!t.file.endsWith('vazio.svg'))?.id;this.render({force:true});}));
  root.querySelectorAll('[data-tile]').forEach(e=>e.addEventListener('click',()=>{this.selected=e.dataset.tile;this.mode='place';this.render({force:true});}));
  root.querySelector('[data-command=rotate]').addEventListener('click',()=>{this.rotation=(this.rotation+90)%360;this.render({force:true});});
  root.querySelector('[data-command=erase]').addEventListener('click',()=>{this.mode='erase';this.render({force:true});});
  root.querySelector('[data-command=draw]').addEventListener('click',()=>{this.mode='place';this.render({force:true});});
  for(const [cmd,delta] of [['zoom-in',.25],['zoom-out',-.25],['zoom-reset',0]])root.querySelector('[data-command='+cmd+']').addEventListener('click',()=>{this.zoom=delta?Math.max(.5,Math.min(2.5,this.zoom+delta)):1;this.render({force:true});});
  root.querySelector('[data-command=save]').addEventListener('click',()=>this.saveMap().catch(e=>ui.notifications.error(e.message)));
  root.querySelector('[data-command=delete]').addEventListener('click',()=>this.deleteMap().catch(e=>ui.notifications.error(e.message)));
  root.querySelector('[data-command=resume]').addEventListener('click',()=>this.resumeMap().catch(e=>ui.notifications.error(e.message)));
  root.querySelector('[data-command=export]')?.addEventListener('click',()=>this.exportMap().catch(e=>ui.notifications.error(e.message)));
  const grid=root.querySelector('.d20-dungeon-grid');
  grid.style.cursor=this.savedId?'default':this.mode==='erase'?'not-allowed':'crosshair';
  if(!this.savedId&&this.mode==='place'&&this.context.editable){
   const ghost=document.createElement('div');ghost.className='d20-dungeon-piece d20-dungeon-ghost';ghost.hidden=true;grid.append(ghost);
   grid.addEventListener('pointerleave',()=>ghost.hidden=true);
   grid.addEventListener('pointermove',e=>{const t=this.context.catalog.find(t=>t.id===this.selected),r=grid.getBoundingClientRect(),cell=SIZE*this.zoom,x=Math.floor((e.clientX-r.left)/cell),y=Math.floor((e.clientY-r.top)/cell);
    try{tilePlacement(t,x,y,this.rotation,this.variant);const swap=this.rotation%180!==0;ghost.style.cssText=`left:${x*cell}px;top:${y*cell}px;width:${(swap?t.gridHeight:t.gridWidth)*cell}px;height:${(swap?t.gridWidth:t.gridHeight)*cell}px`;ghost.innerHTML=`<span style="${texture(t,this.variant,this.zoom)};transform:translate(-50%,-50%) rotate(${this.rotation}deg)"></span>`;ghost.hidden=false;}catch{ghost.hidden=true;}
   });
  }
  grid.addEventListener('click',async e=>{if(this.busy||this.savedId)return;this.busy=true;try{
   const doc=getDocument(),scene=canvas.scene;if(!doc?.isOwner||!scene||scene.id!==this.context.scene?.id)throw Error('Mapa indisponível ou sem permissão.');
   const prefix='flags.d20age.maps.'+scene.id+'.pieces.';
   if(this.mode==='erase'){const id=e.target.closest('[data-piece]')?.dataset.piece;if(id&&Object.hasOwn(doc.getFlag('d20age','maps')?.[scene.id]?.pieces??{},id))await doc.update({[prefix+'-='+id]:null});}
   else{const r=grid.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/(SIZE*this.zoom)),y=Math.floor((e.clientY-r.top)/(SIZE*this.zoom)),tile=this.context.catalog.find(t=>t.id===this.selected);const p=tilePlacement(tile,x,y,this.rotation,this.variant);await doc.update({[prefix+foundry.utils.randomID()]:p});}
   await this.render({force:true});
  }catch(err){ui.notifications.warn(err.message)}finally{this.busy=false;}});
 }
 async saveMap(){
  const doc=getDocument(),scene=canvas.scene;if(!doc?.isOwner||!scene||this.savedId)throw Error('Abra um rascunho editável.');
  const name=await foundry.applications.api.DialogV2.prompt({window:{title:'Salvar masmorra'},rejectClose:false,content:'<label>Nome do mapa <input name="mapName" maxlength="100" required></label>',ok:{label:'Salvar',callback:(event,button)=>button.form.elements.mapName.value.trim().slice(0,100)}});
  if(!name)return;
  const pieces=structuredClone(doc.getFlag('d20age','maps')?.[scene.id]?.pieces??{});if(!Object.keys(pieces).length)throw Error('Desenhe pelo menos uma peça antes de salvar.');
  const id=foundry.utils.randomID();await doc.update({['flags.d20age.savedDungeons.'+id]:{id,name,pieces,author:game.user.name,created:Date.now()}});
  this.savedId=id;await this.render({force:true});ui.notifications.info('Masmorra salva: '+name);
 }
 async deleteMap(){
  const doc=getDocument(),id=this.savedId,saved=doc?.getFlag('d20age','savedDungeons')?.[id];
  if(!doc?.isOwner||!id||!saved)throw Error('Selecione um mapa salvo.');
  const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Excluir mapa salvo'},content:`<p>Excluir <strong>${esc(saved.name)}</strong>? O rascunho e os Tiles já exportados serão preservados.</p>`});
  if(!ok)return;
  await doc.update({['flags.d20age.savedDungeons.-='+id]:null});this.savedId='';await this.render({force:true});
 }
 async resumeMap(){
  const doc=getDocument(),scene=canvas.scene,saved=doc?.getFlag('d20age','savedDungeons')?.[this.savedId];
  if(!doc?.isOwner||!scene||!saved)throw Error('Mapa indisponível.');
  const confirmed=await foundry.applications.api.DialogV2.confirm({window:{title:'Retomar edição'},content:'<p>Copiar o mapa salvo para o rascunho da cena atual? O rascunho atual será substituído, mas o mapa salvo continuará guardado.</p>'});
  if(!confirmed)return;
  const maps=doc.getFlag('d20age','maps')??{},old=maps[scene.id]?.pieces??{},next=structuredClone(saved.pieces??{});
  const prefix='flags.d20age.maps.'+scene.id+'.pieces.';
  const changes=Object.fromEntries(Object.keys(old).filter(id=>!Object.hasOwn(next,id)).map(id=>[prefix+'-='+id,null]));
  for(const [id,piece] of Object.entries(next))changes[prefix+id]=piece;
  if(Object.keys(changes).length)await doc.update(changes);
  this.savedId='';await this.render({force:true});
 }
 async exportMap(){
  if(!game.user.isGM)return;const saved=getDocument()?.getFlag('d20age','savedDungeons')?.[this.savedId];if(!saved)throw Error('Selecione um mapa salvo.');
  const confirmed=await foundry.applications.api.DialogV2.confirm({window:{title:'Exportar masmorra para a cena'},content:'<p>Serão criados Tiles independentes a partir do mapa salvo. Os Tiles existentes serão mantidos. Clique na cena para escolher a origem.</p>'});
  if(!confirmed)return;
  const {beginDungeonExport}=await import('./dungeon-export.mjs');await beginDungeonExport(structuredClone(saved),this.context.catalog);await this.close();
 }
}
export async function openDungeonAtlas(){if(game.user.isGM)await ensureDungeonAtlas();app??=new DungeonAtlas();return app.render({force:true});}
export function addDungeonControl(controls){const notes=controls.notes;if(!notes?.tools)return;notes.tools.d20ageDungeon={name:'d20ageDungeon',title:'D20Age · Atlas de Masmorras',icon:'fa-solid fa-dungeon',order:Math.max(-1,...Object.values(notes.tools).map(t=>Number(t.order)||0))+1,button:true,visible:true,onChange:()=>openDungeonAtlas().catch(e=>ui.notifications.error(e.message))};}
export function registerDungeon(){Hooks.on('getSceneControlButtons',addDungeonControl);Hooks.once('ready',()=>ensureDungeonAtlas().catch(e=>console.error('D20Age · Masmorras',e)));Hooks.on('updateJournalEntry',doc=>{if(doc.getFlag('d20age','dungeonAtlas')&&app?.rendered&&!app.busy)app.render({force:true});});Hooks.on('canvasReady',()=>{if(app?.rendered)app.render({force:true});});}

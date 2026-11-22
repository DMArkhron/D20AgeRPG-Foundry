import {escapeHTML as esc} from './view.mjs';
const SIZE=40, COLS=36, ROWS=28, BASE='systems/d20age';
let app, catalogPromise;
const getDocument=()=>game.journal?.find(d=>d.getFlag('d20age','dungeonAtlas')===true);
export async function ensureDungeonAtlas(){
 if(getDocument()||!game.user.isGM||(game.users?.activeGM&&game.users.activeGM.id!==game.user.id))return getDocument();
 return JournalEntry.create({name:'D20Age · Atlas de Masmorras (cartografia dos jogadores)',ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER},flags:{d20age:{dungeonAtlas:true,maps:{}}}});
}
function loadCatalog(){return catalogPromise??=fetch(BASE+'/content/dungeon-hd.json').then(r=>{if(!r.ok)throw Error('Catálogo indisponível.');return r.json()}).catch(e=>{catalogPromise=null;throw e;});}
export function dungeonLayer(tile){const file=tile?.file??'';return file.startsWith('escadas/')?1:file.startsWith('aberturas/')?3:2;}
export const DEFAULT_DUNGEON_SIZE={cols:COLS,rows:ROWS};
export function dungeonSize(value){return {cols:Number.isInteger(value?.cols)&&value.cols>=8&&value.cols<=120?value.cols:COLS,rows:Number.isInteger(value?.rows)&&value.rows>=8&&value.rows<=120?value.rows:ROWS};}
export function dungeonGeometry(tile,rotation=0){
 const w=tile.gridWidth,h=tile.gridHeight,r=rotation*Math.PI/180;
 const rotated=rotation%90!==0,swap=rotation%180!==0;
 const width=rotated?Math.abs(w*Math.cos(r))+Math.abs(h*Math.sin(r)):swap?h:w;
 const height=rotated?Math.abs(w*Math.sin(r))+Math.abs(h*Math.cos(r)):swap?w:h;
 // Diagonals rotate around the original cell center; cardinal rotations keep the existing top-left anchor.
 const left=rotated?(w-width)/2:0,top=rotated?(h-height)/2:0;
 return {width,height,left,top,cx:left+width/2,cy:top+height/2};
}
export function tilePlacement(tile,x,y,rotation=0,variant='bw',bounds=DEFAULT_DUNGEON_SIZE){
 if(!tile||!['bw','color'].includes(variant)||!Number.isInteger(rotation)||rotation<0||rotation>=360||rotation%45!==0||!Number.isInteger(x*2)||!Number.isInteger(y*2))throw Error('Peça inválida.');
 const g=dungeonGeometry(tile,rotation),{cols,rows}=dungeonSize(bounds);
 if(x+g.left<-1e-8||y+g.top<-1e-8||x+g.left+g.width>cols+1e-8||y+g.top+g.height>rows+1e-8)throw Error('A peça ultrapassa os limites do mapa.');
 return {tile:tile.id,x,y,rotation,variant};
}
const canonicalWalls=new Set(['p1','p3','p5','p7','p15','p121']);
export function dungeonPalette(tile){
 if(tile.file.startsWith('paredes-retas/'))return canonicalWalls.has(tile.id);
 if(tile.file.startsWith('paredes-curvas/'))return /(?:fechado|abertura-n|arco-\d+x\d+-ne|semicirculo-\d+x\d+-n)\.svg$/.test(tile.file);
 return true;
}
const wallLabels={p1:'Parede reta',p3:'Canto em L',p5:'Paredes paralelas',p7:'Junção de três paredes',p15:'Sala fechada',p121:'Meia parede · ½ célula'};
function pieceLabel(t){return wallLabels[t.id]??t.label.replace(/\s+·\s+(?:N|L|S|O|NE|SE|SO|NO)$/,'').replace(/abertura [NLSO]$/,'abertura').replace(/(?:Norte|Sul|Leste|Oeste|Nordeste|Sudeste|Sudoeste|Noroeste)\b/gi,'').replace(/\s+·\s*$/,'').trim();}
function texture(t,variant,scale=1){
 const width=t.gridWidth*SIZE*scale,height=t.gridHeight*SIZE*scale,unit=t.pixelsPerCell??128,filename=t.sheet===undefined?variant:'hd-'+t.sheet+'-'+variant;
 return `width:${width}px;height:${height}px;background-image:url('${BASE}/assets/dungeon/${filename}.png');background-size:${t.atlasWidth/unit*SIZE*scale}px ${t.atlasHeight/unit*SIZE*scale}px;background-position:-${t.sx/unit*SIZE*scale}px -${t.sy/unit*SIZE*scale}px`;
}
function pieceStyle(t,p,cell){const g=dungeonGeometry(t,p.rotation);return `left:${(p.x+g.left)*cell}px;top:${(p.y+g.top)*cell}px;width:${g.width*cell}px;height:${g.height*cell}px`;}
const {ApplicationV2}=foundry.applications.api;
export class DungeonAtlas extends ApplicationV2 {
 static DEFAULT_OPTIONS={classes:['d20age-dungeon-app'],tag:'div',position:{width:1050,height:800},window:{title:'D20Age · Atlas de Masmorras',resizable:true}};
 constructor(options={}){super(options);this.variant='bw';this.rotation=0;this.category='paredes-retas';this.mode='place';this.selected='p1';this.zoom=1;this.savedId='';this.selection=new Set();this.selectionScope='';}
 async _prepareContext(){
  const doc=getDocument(),scene=canvas.scene,catalog=await loadCatalog(),saved=doc?.getFlag('d20age','savedDungeons')??{},map=this.savedId?saved[this.savedId]:doc?.getFlag('d20age','maps')?.[scene?.id];
  const scope=scene?.id+':'+this.savedId;if(scope!==this.selectionScope){this.selection.clear();this.selectionScope=scope;}
  const placements=map?.pieces??{};for(const id of this.selection)if(!Object.hasOwn(placements,id))this.selection.delete(id);
  return {doc,scene,catalog,editable:!!doc?.isOwner,saved,placements,bounds:dungeonSize(map)};
 }
 async _renderHTML(c){
  const tpl=document.createElement('template');this.context=c;const cell=SIZE*this.zoom,selected=c.catalog.find(t=>t.id===this.selected),edit=c.editable&&!this.savedId,disabled=edit?'':'disabled';
  const options=c.catalog.filter(t=>t.file.startsWith(this.category+'/')&&dungeonPalette(t));
  const pieces=Object.entries(c.placements).sort(([,a],[,b])=>dungeonLayer(c.catalog.find(t=>t.id===a.tile))-dungeonLayer(c.catalog.find(t=>t.id===b.tile))).map(([id,p])=>{const t=c.catalog.find(t=>t.id===p.tile);try{tilePlacement(t,p.x,p.y,p.rotation,p.variant,c.bounds)}catch{return ''}return `<div class="d20-dungeon-piece ${this.selection.has(id)?'is-selected':''}" data-piece="${esc(id)}" style="${pieceStyle(t,p,cell)}"><span style="${texture(t,p.variant,this.zoom)};transform:translate(-50%,-50%) rotate(${p.rotation}deg)"></span></div>`}).join('');
  const button=(cmd,icon,label,attrs='')=>`<button type="button" data-command="${cmd}" ${attrs}><i class="fa-solid fa-${icon}"></i> ${label}</button>`;
  const mode=(cmd,value,icon,label)=>button(cmd,icon,label,`aria-pressed="${this.mode===value}" ${disabled}`);
  const categories=[['paredes-retas','border-all','Retas'],['paredes-curvas','circle','Curvas'],['quinas','square','Quinas'],['escadas','stairs','Escadas'],['aberturas','door-open','Portas e janelas']];
  const group=(label,content)=>`<div class="d20-dungeon-group"><b>${label}</b><div>${content}</div></div>`;
  tpl.innerHTML=`<section class="d20-dungeon"><header><strong><i class="fa-solid fa-dungeon"></i> ${esc(c.scene?.name??'Nenhuma cena aberta')}</strong><span>${c.bounds.cols} × ${c.bounds.rows} células · ${Object.keys(c.placements).length} peças</span></header>
  <div class="d20-dungeon-saves"><label>Mapa <select data-select="savedId"><option value="">Rascunho da cena</option>${Object.entries(c.saved).map(([id,m])=>`<option value="${esc(id)}" ${id===this.savedId?'selected':''}>${esc(m.name)} (${Object.keys(m.pieces??{}).length} peças)</option>`).join('')}</select></label>
  ${button('save','floppy-disk','Salvar',disabled)}${button('resume','pen-to-square','Editar',c.editable&&this.savedId?'':'disabled')}${button('delete','trash','Excluir salvo',c.editable&&this.savedId?'':'disabled')}${button('clear','broom','Limpar rascunho',disabled)}${game.user.isGM?button('export','map','Exportar Tiles',this.savedId?'':'disabled'):''}</div>
  <div class="d20-dungeon-tools d20-dungeon-toolbar">
  ${group('Ferramentas',mode('draw','place','pencil','Desenhar')+mode('select','select','object-group','Selecionar')+mode('erase','erase','eraser','Apagar'))}
  ${group('Rotação',button('rotate-left','rotate-left','−45°',disabled)+`<output class="d20-dungeon-angle">${this.rotation}°</output>`+button('rotate','rotate-right','+45°',disabled))}
  ${group('Estilo',button('bw','circle-half-stroke','P&B',`aria-pressed="${this.variant==='bw'}"`)+button('color','palette','Cor',`aria-pressed="${this.variant==='color'}"`))}
  ${group('Zoom',button('zoom-out','minus','')+`<output>${Math.round(this.zoom*100)}%</output>`+button('zoom-in','plus','')+button('zoom-reset','arrows-rotate','100%'))}
  ${group('Tamanho do grid',`<input aria-label="Colunas" title="Colunas" type="number" min="8" max="120" value="${c.bounds.cols}" data-dimension="cols" ${disabled}> × <input aria-label="Linhas" title="Linhas" type="number" min="8" max="120" value="${c.bounds.rows}" data-dimension="rows" ${disabled}>`+button('resize','expand','Aplicar',disabled))}
  </div><nav class="d20-dungeon-categories">${categories.map(([id,icon,label])=>`<button type="button" data-category="${id}" aria-pressed="${this.category===id}"><i class="fa-solid fa-${icon}"></i> ${label}</button>`).join('')}</nav>
  ${this.mode==='select'&&edit?`<div class="d20-dungeon-selectionbar"><strong>${this.selection.size} selecionadas</strong>${button('select-all','object-group','Todas')}${button('deselect','xmark','Desmarcar')}${button('move-left','arrow-left','')}${button('move-up','arrow-up','')}${button('move-down','arrow-down','')}${button('move-right','arrow-right','')}${button('delete-selection','trash','Apagar seleção',this.selection.size?'':'disabled')}<small>Clique ou arraste para selecionar · setas movem 1 célula</small></div>`:''}
  <div class="d20-dungeon-layout"><aside><div class="d20-dungeon-selection"><b>Peça selecionada</b>${selected?`<div class="d20-dungeon-rotation-preview"><span style="${texture(selected,this.variant,Math.min(1,1.1/Math.max(selected.gridWidth,selected.gridHeight)))};transform:rotate(${this.rotation}deg)"></span></div><small>${esc(pieceLabel(selected))} · ${this.rotation}°</small>`:''}</div>${options.map(t=>`<button type="button" data-tile="${t.id}" class="${t.id===this.selected?'selected':''}"><div class="d20-dungeon-thumb"><span style="${texture(t,this.variant,Math.min(1,1.15/Math.max(t.gridWidth,t.gridHeight)))}"></span></div><small>${esc(pieceLabel(t))}${t.label.includes('×')||t.id==='p121'?'':' · '+t.gridWidth+'×'+t.gridHeight}</small></button>`).join('')}</aside>
  <div class="d20-dungeon-scroll"><div class="d20-dungeon-grid" style="width:${c.bounds.cols*cell}px;height:${c.bounds.rows*cell}px;background-size:${cell}px ${cell}px">${pieces}</div></div></div><footer>${this.savedId?'Mapa salvo · somente leitura.':!edit?'O mestre deve autorizar a edição do diário.':this.mode==='erase'?'Apagar: clique numa peça.':this.mode==='select'?'Selecionar: clique em várias peças para mover, girar ou apagar juntas.':'Desenhar: escolha uma peça, gire e clique na grade. Meia parede encaixa de meia em meia célula.'} · O mapa não interfere na cena real.</footer></section>`;return tpl.content;
 }
 _replaceHTML(result,content){const old=content.querySelector('.d20-dungeon-scroll'),left=old?.scrollLeft??0,top=old?.scrollTop??0;content.replaceChildren(result);const next=content.querySelector('.d20-dungeon-scroll');if(next){next.scrollLeft=left;next.scrollTop=top;}}
 async _onRender(context,options){
  await super._onRender(context,options);const root=this.element;
  const refresh=()=>this.render({force:true});
  const run=fn=>async()=>{if(this.busy)return;this.busy=true;try{await fn();if(this.rendered!==false)await refresh();}catch(e){ui.notifications.warn(e.message)}finally{this.busy=false;}};
  const on=(cmd,fn)=>root.querySelector('[data-command='+cmd+']')?.addEventListener('click',run(fn));
  root.querySelector('[data-select=savedId]').addEventListener('change',e=>{this.savedId=e.target.value;this.selection.clear();refresh();});
  root.querySelectorAll('[data-category]').forEach(e=>e.addEventListener('click',()=>{this.category=e.dataset.category;this.selected=this.context.catalog.find(t=>t.file.startsWith(this.category+'/')&&dungeonPalette(t))?.id;this.mode='place';refresh();}));
  root.querySelectorAll('[data-tile]').forEach(e=>e.addEventListener('click',()=>{this.selected=e.dataset.tile;this.mode='place';refresh();}));
  for(const [cmd,mode] of [['draw','place'],['select','select'],['erase','erase']])on(cmd,()=>{this.mode=mode;if(mode!=='select')this.selection.clear();});
  for(const [cmd,delta] of [['rotate',45],['rotate-left',-45]])on(cmd,async()=>{if(this.mode==='select'&&this.selection.size)await this.editSelection(p=>({...p,rotation:(p.rotation+delta+360)%360}));else this.rotation=(this.rotation+delta+360)%360;});
  on('bw',()=>{this.variant='bw';});on('color',()=>{this.variant='color';});
  for(const [cmd,delta] of [['zoom-in',.25],['zoom-out',-.25],['zoom-reset',0]])on(cmd,()=>{this.zoom=delta?Math.max(.5,Math.min(2.5,this.zoom+delta)):1;});
  for(const [cmd,fn] of [['save',()=>this.saveMap()],['delete',()=>this.deleteMap()],['resume',()=>this.resumeMap()],['export',()=>this.exportMap()],['clear',()=>this.clearDraft()]])on(cmd,fn);
  on('resize',()=>this.resizeDraft(Number(root.querySelector('[data-dimension=cols]').value),Number(root.querySelector('[data-dimension=rows]').value)));
  on('select-all',()=>{this.selection=new Set(Object.keys(this.context.placements));});on('deselect',()=>this.selection.clear());
  on('delete-selection',()=>this.editSelection(()=>null));
  for(const [cmd,dx,dy] of [['move-left',-1,0],['move-right',1,0],['move-up',0,-1],['move-down',0,1]])on(cmd,()=>this.editSelection(p=>({...p,x:p.x+dx,y:p.y+dy})));
  const grid=root.querySelector('.d20-dungeon-grid');
  grid.style.cursor=this.savedId?'default':this.mode==='erase'?'not-allowed':this.mode==='select'?'pointer':'crosshair';
  const point=(e,t)=>{const r=grid.getBoundingClientRect(),cell=SIZE*this.zoom,step=t?.id==='p121'?.5:1;return {x:Math.floor((e.clientX-r.left)/cell/step)*step,y:Math.floor((e.clientY-r.top)/cell/step)*step};};
  if(!this.savedId&&this.mode==='place'&&this.context.editable){
   const ghost=document.createElement('div');ghost.className='d20-dungeon-piece d20-dungeon-ghost';ghost.hidden=true;grid.append(ghost);
   grid.addEventListener('pointerleave',()=>ghost.hidden=true);
   grid.addEventListener('pointermove',e=>{const t=this.context.catalog.find(t=>t.id===this.selected),{x,y}=point(e,t);
    try{const p=tilePlacement(t,x,y,this.rotation,this.variant,this.context.bounds);ghost.style.cssText=pieceStyle(t,p,SIZE*this.zoom);ghost.innerHTML=`<span style="${texture(t,this.variant,this.zoom)};transform:translate(-50%,-50%) rotate(${this.rotation}deg)"></span>`;ghost.hidden=false;}catch{ghost.hidden=true;}
   });
  }
  let dragStart=null,marquee=null,skipClick=false;
  if(this.mode==='select'&&!this.savedId&&this.context.editable){
   grid.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragStart={x:e.clientX,y:e.clientY,id:e.pointerId};});
   grid.addEventListener('pointermove',e=>{
    if(!dragStart||!(e.buttons&1))return;
    if(!marquee&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<5)return;
    if(!marquee){marquee=document.createElement('div');marquee.className='d20-dungeon-marquee';grid.append(marquee);grid.setPointerCapture(e.pointerId);}
    const rect=grid.getBoundingClientRect();marquee.style.cssText=`left:${Math.min(e.clientX,dragStart.x)-rect.left}px;top:${Math.min(e.clientY,dragStart.y)-rect.top}px;width:${Math.abs(e.clientX-dragStart.x)}px;height:${Math.abs(e.clientY-dragStart.y)}px`;
   });
   grid.addEventListener('pointerup',e=>{
    if(marquee){const rect=marquee.getBoundingClientRect();for(const el of grid.querySelectorAll('[data-piece]')){const r=el.getBoundingClientRect();if(r.left<rect.right&&r.right>rect.left&&r.top<rect.bottom&&r.bottom>rect.top)this.selection.add(el.dataset.piece);}marquee.remove();marquee=null;skipClick=true;setTimeout(()=>{skipClick=false;refresh();},0);}
    dragStart=null;
   });
   grid.addEventListener('pointercancel',()=>{marquee?.remove();marquee=null;dragStart=null;});
  }
  grid.addEventListener('click',async e=>{if(skipClick||this.busy||this.savedId)return;this.busy=true;try{
   const {doc,scene,map,prefix}=this.draft();
   const id=e.target.closest('[data-piece]')?.dataset.piece;
   if(this.mode==='select'){if(id){if(this.selection.has(id))this.selection.delete(id);else this.selection.add(id);}}
   else if(this.mode==='erase'){if(id&&Object.hasOwn(map.pieces??{},id))await doc.update({[prefix+'pieces.-='+id]:null});}
   else{const tile=this.context.catalog.find(t=>t.id===this.selected),{x,y}=point(e,tile);const p=tilePlacement(tile,x,y,this.rotation,this.variant,dungeonSize(map));await doc.update({[prefix+'pieces.'+foundry.utils.randomID()]:p});}
   await refresh();
  }catch(err){ui.notifications.warn(err.message)}finally{this.busy=false;}});
 }
 draft(){const doc=getDocument(),scene=canvas.scene;if(!doc?.isOwner||!scene||this.savedId||scene.id!==this.context?.scene?.id)throw Error('Abra um rascunho editável.');return {doc,scene,map:doc.getFlag('d20age','maps')?.[scene.id]??{},prefix:'flags.d20age.maps.'+scene.id+'.'};}
 async clearDraft(){
  const {doc,map,prefix}=this.draft();if(!Object.keys(map.pieces??{}).length)return;
  if(!await foundry.applications.api.DialogV2.confirm({window:{title:'Limpar rascunho'},content:'<p>Apagar todas as peças do rascunho atual? Os mapas salvos continuarão guardados.</p>'}))return;
  const current=this.draft();if(current.prefix!==prefix)throw Error('A cena mudou.');
  await doc.update(Object.fromEntries(Object.keys(current.map.pieces??{}).map(id=>[prefix+'pieces.-='+id,null])));this.selection.clear();
 }
 async resizeDraft(cols,rows){
  const {doc,map,prefix}=this.draft();if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<8||rows<8||cols>120||rows>120)throw Error('Escolha de 8 a 120 colunas e linhas.');
  for(const p of Object.values(map.pieces??{}))tilePlacement(this.context.catalog.find(t=>t.id===p.tile),p.x,p.y,p.rotation,p.variant,{cols,rows});
  await doc.update({[prefix+'cols']:cols,[prefix+'rows']:rows});
 }
 async editSelection(transform){
  const {doc,map,prefix}=this.draft(),changes={};for(const id of this.selection){const p=map.pieces?.[id];if(!p)continue;const next=transform(p);if(!next)changes[prefix+'pieces.-='+id]=null;else changes[prefix+'pieces.'+id]=tilePlacement(this.context.catalog.find(t=>t.id===next.tile),next.x,next.y,next.rotation,next.variant,dungeonSize(map));}
  if(Object.keys(changes).length)await doc.update(changes);
 }
 async saveMap(){
  const doc=getDocument(),scene=canvas.scene;if(!doc?.isOwner||!scene||this.savedId)throw Error('Abra um rascunho editável.');
  const name=await foundry.applications.api.DialogV2.prompt({window:{title:'Salvar masmorra'},rejectClose:false,content:'<label>Nome do mapa <input name="mapName" maxlength="100" required></label>',ok:{label:'Salvar',callback:(event,button)=>button.form.elements.mapName.value.trim().slice(0,100)}});
  if(!name)return;
  const draft=doc.getFlag('d20age','maps')?.[scene.id];const pieces=structuredClone(draft?.pieces??{});if(!Object.keys(pieces).length)throw Error('Desenhe pelo menos uma peça antes de salvar.');
  const id=foundry.utils.randomID();await doc.update({['flags.d20age.savedDungeons.'+id]:{id,name,pieces,...dungeonSize(draft),author:game.user.name,created:Date.now()}});
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
  const bounds=dungeonSize(saved);changes['flags.d20age.maps.'+scene.id+'.cols']=bounds.cols;changes['flags.d20age.maps.'+scene.id+'.rows']=bounds.rows;
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

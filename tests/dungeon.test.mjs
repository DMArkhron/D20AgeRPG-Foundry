import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './foundry-stub.mjs';
import {tilePlacement,addDungeonControl} from '../scripts/dungeon.mjs';
test('atlas preserves rectangular footprint, rotation and grid boundaries',()=>{
 const t={id:'p1',gridWidth:2,gridHeight:5};
 assert.deepEqual(tilePlacement(t,31,26,90,'color'),{tile:'p1',x:31,y:26,rotation:90,variant:'color'});
 assert.throws(()=>tilePlacement(t,31,26,0));
 assert.throws(()=>tilePlacement(t,-1,0,0));
 assert.throws(()=>tilePlacement(t,0,0,45));
});
test('atlas available in Notes for players',()=>{
 const controls={notes:{tools:{}}};addDungeonControl(controls);assert.equal(controls.notes.tools.d20ageDungeon.visible,true);
});
test('catalog contains all 96 assets, with exact dimensions and in-bounds sprite rectangles',()=>{
 const items=JSON.parse(fs.readFileSync(new URL('../content/dungeon.json',import.meta.url)));
 assert.equal(items.length,96);assert.equal(new Set(items.map(t=>t.id)).size,96);
 for(const t of items){assert.equal(t.sw,t.gridWidth*128);assert.equal(t.sh,t.gridHeight*128);assert.ok(t.sx+t.sw<=t.atlasWidth&&t.sy+t.sh<=t.atlasHeight);}
 for(const mode of ['bw','color']){const b=fs.readFileSync(new URL('../assets/dungeon/'+mode+'.png',import.meta.url));assert.equal(b.readUInt32BE(16),items[0].atlasWidth);assert.equal(b.readUInt32BE(20),items[0].atlasHeight);assert.equal(b.subarray(-8,-4).toString(),'IEND');}
});

test('native Tile export preserves rotated rectangular footprints and grid origin',async()=>{
 const {exportTileData}=await import('../scripts/dungeon-export.mjs');
 const t={id:'p2',gridWidth:1,gridHeight:3},p={tile:'p2',x:2,y:4,rotation:90,variant:'bw'};
 const d=exportTileData(t,p,{x:1000,y:500},100,'d20age-dungeon-tiles-v1/bw-p2.png','map');
 assert.deepEqual([d.x,d.y,d.width,d.height,d.rotation],[1300,800,100,300,90]);
 assert.equal(d.flags.d20age.dungeonAtlas,'map');
 assert.equal(d.texture.src,'d20age-dungeon-tiles-v1/bw-p2.png');
});

test('saving a dungeon creates a named snapshot independent of the draft',async()=>{
 const {DungeonAtlas}=await import('../scripts/dungeon.mjs');
 const oldGame=globalThis.game,oldCanvas=globalThis.canvas,oldPrompt=foundry.applications.api.DialogV2.prompt,oldUtils=foundry.utils,oldInfo=ui.notifications.info;
 const pieces={a:{tile:'p1',x:2,y:3,rotation:0,variant:'bw'}};let update;
 const doc={isOwner:true,getFlag(ns,key){return key==='dungeonAtlas'?true:key==='maps'?{scene:{pieces}}:undefined;},async update(data){update=data;}};
 globalThis.game={journal:[doc],user:{name:'Cartógrafo'}};globalThis.canvas={scene:{id:'scene'}};
 foundry.applications.api.DialogV2.prompt=async()=> 'Catacumbas';foundry.utils={randomID:()=> 'map1'};ui.notifications.info=()=>{};
 try{const app=new DungeonAtlas();await app.saveMap();const saved=update['flags.d20age.savedDungeons.map1'];assert.equal(saved.name,'Catacumbas');assert.equal(app.savedId,'map1');pieces.a.x=9;assert.equal(saved.pieces.a.x,2);}finally{globalThis.game=oldGame;globalThis.canvas=oldCanvas;foundry.applications.api.DialogV2.prompt=oldPrompt;foundry.utils=oldUtils;ui.notifications.info=oldInfo;}
});

test('four opening assets extend the existing atlas without changing old IDs',()=>{
 const entries=JSON.parse(fs.readFileSync(new URL('../content/dungeon-openings.json',import.meta.url)));
 assert.deepEqual(entries.map(t=>t.id),['p96','p97','p98','p99']);
 for(const t of entries){assert.equal(t.gridWidth,1);assert.equal(t.gridHeight,1);assert.ok(t.sx+t.sw<=t.atlasWidth&&t.sy+t.sh<=t.atlasHeight);}
});

test('extended atlas adds corner, wide stairs and long openings with distinct sprite IDs and layers',async()=>{
 const {dungeonLayer}=await import('../scripts/dungeon.mjs');
 const {exportTileData}=await import('../scripts/dungeon-export.mjs');
 const all=['dungeon','dungeon-openings','dungeon-extra'].flatMap(name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url))));
 assert.equal(all.length,121);assert.equal(new Set(all.map(t=>t.id)).size,121);
 const extra=all.slice(100);
 assert.equal(extra[0].file,'quinas/quina.svg');
 assert.deepEqual(extra.slice(1,5).map(t=>[t.gridWidth,t.gridHeight]),[[2,1],[3,1],[4,1],[5,1]]);
 assert.equal(extra.slice(5).length,16);
 for(const t of all){
  assert.deepEqual([t.sw,t.sh],[t.gridWidth*128,t.gridHeight*128]);
  assert.ok(t.sx+t.sw<=t.atlasWidth&&t.sy+t.sh<=t.atlasHeight);
  assert.equal(t.atlasHeight,all[0].atlasHeight);
 }
 for(const t of extra){
  const layer=t.file.startsWith('escadas/')?1:t.file.startsWith('aberturas/')?3:2;
  assert.equal(dungeonLayer(t),layer);
  const d=exportTileData(t,tilePlacement(t,0,0,90),{x:0,y:0},100,'texture.png','map');
  assert.equal(d.sort,layer*100000);assert.equal(d.flags.d20age.dungeonLayer,layer);
 }
});

test('HD palette hides rotated duplicates without invalidating saved IDs',async()=>{
 const {dungeonPalette}=await import('../scripts/dungeon.mjs');
 const a=JSON.parse(fs.readFileSync(new URL('../content/dungeon-hd.json',import.meta.url)));
 assert.equal(a.length,122);assert.equal(new Set(a.map(t=>t.id)).size,122);
 assert.deepEqual(a.filter(t=>t.file.startsWith('paredes-retas/')&&dungeonPalette(t)).map(t=>t.id),['p1','p3','p5','p7','p15','p121']);
 assert.equal(a.filter(t=>t.file.startsWith('paredes-curvas/')&&dungeonPalette(t)).length,20);
 for(const t of a){assert.equal(t.sw,t.gridWidth*256);assert.equal(t.sh,t.gridHeight*256);assert.ok(t.sx+t.sw<=t.atlasWidth&&t.sy+t.sh<=t.atlasHeight);}
 for(const t of a.filter((t,i)=>a.findIndex(x=>x.sheet===t.sheet)===i))for(const mode of ['bw','color']){
  const b=fs.readFileSync(new URL('../assets/dungeon/hd-'+t.sheet+'-'+mode+'.png',import.meta.url));
  assert.equal(b.readUInt32BE(16),t.atlasWidth);assert.equal(b.readUInt32BE(20),t.atlasHeight);assert.equal(b.subarray(-8,-4).toString(),'IEND');
 }
});

test('diagonal and half-cell placement respect resized bounds and export center',async()=>{
 const {dungeonGeometry,tilePlacement}=await import('../scripts/dungeon.mjs');
 const {exportTileData}=await import('../scripts/dungeon-export.mjs');
 const t={id:'p121',gridWidth:.5,gridHeight:1,file:'paredes-retas/meia-parede.svg'};
 assert.doesNotThrow(()=>tilePlacement(t,39.5,29,0,'bw',{cols:40,rows:30}));
 assert.throws(()=>tilePlacement(t,39.5,29,45,'bw',{cols:40,rows:30}));
 const p=tilePlacement(t,38.5,28,45,'bw',{cols:40,rows:30});
 const g=dungeonGeometry(t,45);assert.ok(Math.abs(g.width-1.06066)<.00001);
 const d=exportTileData(t,p,{x:100,y:100},100,'test.png','map',{cols:40,rows:30});
 assert.equal(d.x,3950);assert.equal(d.y,2900);assert.equal(d.width,50);assert.equal(d.rotation,45);
});

test('selection movement validates every piece before writing and resize rejects clipping',async()=>{
 const {DungeonAtlas}=await import('../scripts/dungeon.mjs');
 const app=new DungeonAtlas(),updates=[],tile={id:'p1',gridWidth:1,gridHeight:1};
 const map={cols:40,rows:30,pieces:{a:{tile:'p1',x:0,y:0,rotation:0,variant:'bw'},b:{tile:'p1',x:39,y:29,rotation:0,variant:'bw'}}};
 app.context={catalog:[tile]};app.selection=new Set(['a','b']);app.draft=()=>({doc:{update:async v=>updates.push(v)},map,prefix:'draft.'});
 await assert.rejects(()=>app.editSelection(p=>({...p,x:p.x+1})));assert.equal(updates.length,0);
 await assert.rejects(()=>app.resizeDraft(36,28));assert.equal(updates.length,0);
 await app.editSelection(()=>null);assert.deepEqual(updates[0],{'draft.pieces.-=a':null,'draft.pieces.-=b':null});
 await app.resizeDraft(45,35);assert.deepEqual(updates[1],{'draft.cols':45,'draft.rows':35});
});

test('terrain settings keep all atlas layers below tokens without changing their relative order',async()=>{
 const {dungeonTerrainSettings,dungeonTileRepair}=await import('../scripts/dungeon-export.mjs');
 const layers=[1,2,3].map(l=>dungeonTerrainSettings(l,1999));
 assert.ok(layers[0].sort<layers[1].sort&&layers[1].sort<layers[2].sort&&layers[2].sort<0);
 for(const t of layers){assert.equal(t.locked,true);assert.deepEqual(t.restrictions,{light:false,weather:false});assert.equal(t.occlusion.mode,0);}
 assert.equal(dungeonTileRepair({id:'unrelated',flags:{}}),null);
 assert.equal(dungeonTileRepair({id:'done',flags:{d20age:{dungeonAtlas:'map',terrainRevision:1}}}),null);
 const repair=dungeonTileRepair({id:'old',sort:300005,x:20,y:30,flags:{d20age:{dungeonAtlas:'map',dungeonLayer:3}}});
 assert.equal(repair.sort,-99995);assert.equal(repair._id,'old');assert.equal(repair['flags.d20age.terrainRevision'],1);
 assert.equal('x' in repair,false);assert.equal('y' in repair,false);
});

test('repair updates exclusively atlas tiles and only from active GM',async()=>{
 const {repairDungeonTiles}=await import('../scripts/dungeon-export.mjs');
 const old=globalThis.game,updates=[];
 const scene={tiles:[{id:'old',sort:200003,flags:{d20age:{dungeonAtlas:'map',dungeonLayer:2}}},{id:'other',flags:{}}],updateEmbeddedDocuments:async(type,data)=>updates.push({type,data})};
 try{
 globalThis.game={user:{isGM:false,id:'p'}};assert.equal(await repairDungeonTiles(scene),0);
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'other'}}};assert.equal(await repairDungeonTiles(scene),0);
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}}};assert.equal(await repairDungeonTiles(scene),1);
 assert.equal(updates.length,1);assert.equal(updates[0].type,'Tile');assert.equal(updates[0].data[0]._id,'old');
 }finally{globalThis.game=old;}
});

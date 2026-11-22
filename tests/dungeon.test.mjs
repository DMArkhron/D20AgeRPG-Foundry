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

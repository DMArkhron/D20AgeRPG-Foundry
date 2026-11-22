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

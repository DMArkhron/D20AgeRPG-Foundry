import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {tileData,tileAtPoint,installHexcrawl} from '../scripts/hexcrawl.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const docs=JSON.parse(readFileSync(join(root,'content/hexcrawl.json'),'utf8'));
test('27 ícones em dois estilos PNG transparentes',async()=>{
 assert.equal(docs.length,27);
 for(const entry of docs){
  assert.equal(entry.pages.length,2);
  for(const page of entry.pages){
   assert.match(page.src,/^systems\/d20age\/assets\/hexcrawl\/(color|bw)\/[a-z]+\.png$/);
   const path=join(root,page.src.replace('systems/d20age/',''));
   assert.ok(existsSync(path));
   const buffer=readFileSync(path);
   assert.equal(buffer.toString('ascii',1,4),'PNG');
   assert.ok(buffer[25]===6 || (buffer[25]===3 && buffer.includes(Buffer.from('tRNS'))),'PNG deve ter canal alfa ou paleta transparente');
   const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
   assert.ok(width<490 && width>430 && height>490 && height<=512,'A moldura transparente externa deve estar recortada');
  }
 }
});
test('Tile independente sempre ocupa uma célula da grade',()=>{
 const tile=tileData({slug:'tundra',variant:'bw',x:380,y:220,gridSize:100,gridWidth:100,gridHeight:116});
 assert.equal(tile.texture.src,'systems/d20age/assets/hexcrawl/bw/tundra.png');
 assert.deepEqual([tile.x,tile.y,tile.width,tile.height],[330,162,100,116]);
 assert.equal(tile.actorId,undefined);
 assert.throws(()=>tileData({slug:'../../secret',variant:'color',x:0,y:0,gridSize:100}));
});
test('clique usa diretamente a grade V13/V14 e centra o Tile no hexágono',()=>{
 const grid={size:100,sizeX:100,sizeY:116,getCenterPoint(point){
  assert.deepEqual(point,{x:395,y:228});return {x:380,y:220};
 }};
 const tile=tileAtPoint({slug:'floresta',variant:'color',point:{x:395,y:228},grid});
 assert.deepEqual([tile.x,tile.y,tile.width,tile.height],[330,162,100,116]);
 assert.throws(()=>tileAtPoint({slug:'floresta',variant:'color',point:{x:1,y:1},grid:undefined}),/grade da cena/);
});
test('atualização remove apenas compêndios antigos totalmente gerados pelo sistema',async()=>{
 let version='',deletes=0;
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},packs:new Map(),settings:{get:()=>version,set:async(ns,key,value)=>{version=value;}}};
 globalThis.ui={notifications:{warn(){}}};
 game.packs.set('world.d20age-hexcrawl',{getIndex:async()=>[{flags:{d20age:{hexcrawl:'vila'}}}],deleteCompendium:async()=>{deletes++;}});
 game.packs.set('world.d20age-hexcrawl-tools',{getIndex:async()=>[{flags:{d20age:{hexcrawlTool:true}}}],deleteCompendium:async()=>{deletes++;}});
 await installHexcrawl();assert.equal(deletes,2);assert.equal(version,'2');
 await installHexcrawl();assert.equal(deletes,2);
 game.user.isGM=false;await installHexcrawl();assert.equal(deletes,2);
});

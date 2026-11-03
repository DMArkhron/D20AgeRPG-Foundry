import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {tileData,HEXCRAWL_COLLECTION,installHexcrawl} from '../scripts/hexcrawl.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const docs=JSON.parse(readFileSync(join(root,'content/hexcrawl.json'),'utf8'));

test('atlas has 27 unique journals with two existing image pages each',()=>{
 assert.equal(HEXCRAWL_COLLECTION,'world.d20age-hexcrawl');
 assert.equal(docs.length,27);
 assert.equal(new Set(docs.map(d=>d._id)).size,27);
 for(const entry of docs){
  assert.equal(entry.pages.length,2,entry.name);
  assert.deepEqual(entry.pages.map(p=>p.name),['Colorido','Preto e branco']);
  for(const page of entry.pages){
   assert.match(page.src,/^systems\/d20age\/assets\/hexcrawl\/(color|bw)\/[a-z]+\.jpg$/);
   assert.ok(existsSync(join(root,page.src.replace('systems/d20age/',''))),page.src);
  }
 }
 assert.equal(docs.find(d=>d.flags.d20age.hexcrawl==='tundra')?.pages.length,2);
});

test('tile placement uses independent images and honors requested size',()=>{
 const tile=tileData({slug:'tundra',variant:'bw',x:380,y:220,size:2,gridSize:100});
 assert.equal(tile.texture.src,'systems/d20age/assets/hexcrawl/bw/tundra.jpg');
 assert.deepEqual([tile.x,tile.y,tile.width,tile.height],[280,120,200,200]);
 assert.equal(tile.flags.d20age.hexcrawl,'tundra');
 assert.equal(tile.actorId,undefined);
 assert.throws(()=>tileData({slug:'../../secret',variant:'color',x:0,y:0,size:1,gridSize:100}));
});

test('GM installs the atlas and placement macro once, while players cannot write',async()=>{
 const packs=new Map(),folders=[];let writes=0,version='';
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},packs,folders,
  settings:{get:()=>version,set:async(ns,key,value)=>{version=value;}}};
 globalThis.ui={notifications:{info(){}}};
 globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(docs)});
 globalThis.Folder={async create(data){const f={...data,id:`folder${folders.length}`,getFlag:(s,k)=>data.flags?.[s]?.[k]};folders.push(f);return f;},
  async createDocuments(data,{pack}){for(const f of data)packs.get(pack).folders.set(f._id,f);}};
 globalThis.foundry={documents:{collections:{CompendiumCollection:{async createCompendium({name,type}){
  const collection='world.'+name,index=new Map();
  const p={collection,documentName:type,folders:new Map(),locked:false,async setFolder(){},async getIndex(){return index;},
   async configure({locked}){this.locked=locked;},async getDocument(id){return index.get(id);},
   documentClass:{async createDocuments(data){for(const doc of data){index.set(doc._id,{...doc,pages:new Map(doc.pages?.map(p=>[p._id,p])??[])});writes++;}}}};
  packs.set(collection,p);return p;
 }}}}};
 await installHexcrawl();
 assert.equal(packs.get(HEXCRAWL_COLLECTION).folders.size,6);
 assert.equal((await packs.get(HEXCRAWL_COLLECTION).getIndex()).size,27);
 assert.equal((await packs.get('world.d20age-hexcrawl-tools').getIndex()).size,1);
 assert.equal(version,'1');
 await installHexcrawl();assert.equal(writes,28);
 game.user.isGM=false;await installHexcrawl({force:true});assert.equal(writes,28);
});

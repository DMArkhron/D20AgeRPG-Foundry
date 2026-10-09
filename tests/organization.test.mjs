import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(`content/${name}.json`,root),'utf8'));
test('all native folders have valid parents, types and bounded acyclic hierarchy',()=>{
 const folders=read('folders');const types={bestiary:'Actor',equipment:'Item',spells:'Item',abilities:'Item','magic-items':'Item',rolltables:'RollTable',references:'JournalEntry',macros:'Macro'};
 let count=0;
 for(const [pack,rows] of Object.entries(folders)){
  const map=new Map(rows.map(f=>[f._id,f]));assert.equal(map.size,rows.length);count+=rows.length;
  for(const f of rows){assert.equal(f.type,types[pack]);let parent=f;const seen=new Set();while(parent){assert(!seen.has(parent._id));seen.add(parent._id);assert(seen.size<=3);if(parent.folder)assert(map.has(parent.folder));parent=map.get(parent.folder)} }
  for(const d of read(pack)){assert(map.has(d.folder),`${pack}: ${d.name}`);assert.equal(map.get(d.folder).flags.d20age.path,d.flags.d20age.folderPath.join('/'))}
 }
 assert.equal(count,read('catalog').folders);
 assert.deepEqual(folders.bestiary.filter(f=>!f.folder).map(f=>f.name).sort(),['Bestas','Construtos','Desmortos','Dracônicos','Extraplanares','Feéricos','Floranídeos','Gigantes','Humanoides','Monstros'].sort());
});
test('all records, embedded creature items and token portraits resolve to safe local vector icons',()=>{
 const files=new Set();
 for(const pack of Object.keys(read('folders')))for(const d of read(pack)){
  const docs=[d,...(d.items??[])];
  for(const entry of docs){assert(entry.img.startsWith('systems/d20age/assets/icons/'));const file=new URL(entry.img.slice('systems/d20age/'.length),root);assert(existsSync(file));files.add(entry.img);const svg=readFileSync(file,'utf8');assert.match(svg,/^<svg\s/);assert.match(svg,/<title\b/);assert.match(svg,/viewBox="0 0 128 128"/);assert.doesNotMatch(svg,/<(?:image|script|foreignObject)\b|href=|onload=/i)}
  if(pack==='bestiary'){assert.match(d.prototypeToken.texture.src,/assets\/tokens\//);assert.ok(existsSync(new URL(d.prototypeToken.texture.src.replace('systems/d20age/',''),root)));}
 }
 assert.equal(files.size,read('catalog').icons);
});

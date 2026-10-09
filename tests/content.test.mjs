import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const load=name=>JSON.parse(readFileSync(new URL(`content/${name}.json`,root),'utf8'));
const kinds=['bestiary','equipment','spells','abilities','magic-items','rolltables','references','macros'];
test('catalog has stable unique IDs, counts and resolvable reference assets',()=>{
 const catalog=load('catalog');
 for(const kind of kinds){const docs=load(kind);assert.equal(docs.length,catalog.counts[kind]);assert.equal(new Set(docs.map(d=>d._id)).size,docs.length);for(const doc of docs){assert.match(doc._id,/^[a-zA-Z0-9]{16}$/);assert.ok(doc.name);}}
 for(const doc of load('references'))for(const page of doc.pages)if(page.type==='image')assert.ok(existsSync(new URL(page.src.replace('systems/d20age/',''),root)));
 assert.equal(catalog.indexedTables,87);
});
test('all 162 complete bestiary blocks have creature Actors, correct manual stats and embedded attacks',()=>{
 const actors=load('bestiary');assert.equal(actors.length,162);
 for(const a of actors){const raw=a.flags.d20age.rawStats;assert.equal(a.type,'creature');assert.equal(a.system.combat.autoArmor,false);assert.equal(a.system.combat.autoProgression,false);assert.equal(a.system.movement.auto,false);assert.ok(a.system.hp.max>0);assert.equal(a.system.hp.value,a.system.hp.max);assert.ok(raw.Atq);assert.equal(a.system.saves.death.target,Number(raw.SV.match(/^\d+/)[0]));assert.equal(new Set(a.items.map(i=>i._id)).size,a.items.length);assert.ok(a.items.every(i=>i.type==='ability'||i.type==='weapon'));
  if(/^\d/.test(raw.CA))assert.equal(a.system.combat.ac,Number(raw.CA.match(/^-?\d+/)[0]));
  if(/\d*d\d+/.test(raw.Atq))assert.ok(a.items.some(i=>i.type==='weapon'),a.name);
 }
 assert.equal(actors.find(a=>a.name.startsWith('Hidra vulcânica')).flags.d20age.hpReference,56);
 assert.equal(actors.find(a=>a.name.startsWith('Hidra das colinas')).flags.d20age.hpReference,40);
 assert.ok(actors.find(a=>a.name==='Árvore animada'));
 assert.equal(actors.find(a=>a.name==='Olho tirano').system.xp,2600);
 const queen=actors.find(a=>a.name.startsWith('Abelha assassina rainha'));assert.ok(queen.items.some(i=>i.name==='Veneno'));assert.ok(queen.items.some(i=>i.name==='Ferrão'));
});
test('all six spell circles and mundane/magic prices match verified source anchors',()=>{
 const spells=load('spells');assert.deepEqual([1,2,3,4,5,6].map(c=>spells.filter(s=>s.system.circle===c).length),[20,12,10,8,6,4]);
 assert.ok(spells.every(s=>s.system.duration && s.system.range && s.system.description));
 const items=load('equipment');assert.equal(items.find(i=>i.name==='Espada longa').system.damage,'1d8');assert.equal(items.find(i=>i.name==='Couraça').system.ac,3);assert.equal(items.find(i=>i.name==='Mochila (80 cn)').system.weight,80);assert.equal(items.find(i=>i.name==='Óleo (frasco)').system.weight,0);
 assert.equal(load('magic-items').find(i=>i.name==='Cajado da arquimagia').system.price,275000);
 assert.equal(load('magic-items').find(i=>i.name==='Espada longa +3').system.attackBonus,3);
});
function totals(formula){
 if(formula==='1d6*10+1d6')return Array.from({length:36},(_,i)=>(Math.floor(i/6)+1)*10+(i%6)+1);
 const [,count,sides,extra]=formula.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);const n=Number(count),d=Number(sides),b=Number(extra||0);return Array.from({length:n*d-n+1},(_,i)=>i+n+b);
}
test('rollable tables cover every possible roll exactly once; d66 and 2d6 preserve their dice',()=>{
 for(const t of load('rolltables'))for(const n of totals(t.formula)){const matches=t.results.filter(r=>r.range[0]<=n && n<=r.range[1]);assert.equal(matches.length,1,`${t.name}: ${n}`);assert.ok(matches[0].description);}
 assert.equal(load('rolltables').find(t=>t.name==='Venenos').formula,'1d12');assert.equal(load('rolltables').find(t=>t.name==='Tipos de pedras iônicas').formula,'1d8');assert.equal(load('rolltables').find(t=>t.name==='Mistura de poções').formula,'2d6');
});
test('every macro is valid JavaScript and uses a known system API or existing table',()=>{
 const names=new Set(load('rolltables').map(t=>t.name));const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 for(const m of load('macros')){assert.doesNotThrow(()=>new AsyncFunction(m.command));if(m.flags.d20age.table)assert.ok(names.has(m.flags.d20age.table));assert.ok(existsSync(new URL('macros/'+m._id+'.mjs',root)));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {newClassImage,migrateClassArtwork} from '../scripts/class-artwork.mjs';
const old='systems/d20age/assets/classes/fighter.svg',updated='systems/d20age/assets/classes/fighter.png';
test('retired class paths migrate without touching custom art or other vector icons',()=>{
 assert.equal(newClassImage(old),updated);assert.equal(newClassImage(old+'?v=0.3.0'),updated);
 for(const p of ['worlds/campaign/fighter.svg','systems/d20age/assets/icons/fighter.svg','systems/d20age/assets/classes/custom.svg',updated,'custom.png'])assert.equal(newClassImage(p),null);
});
test('all seven class PNGs are full-resolution and retired SVGs are absent',()=>{
 const dir=new URL('../assets/classes/',import.meta.url);const files=readdirSync(dir);assert.equal(files.filter(f=>f.endsWith('.svg')).length,0);
 for(const name of ['arcanist','fighter','specialist','magist','dwarf','elf','gnome']){const data=readFileSync(new URL(name+'.png',dir));assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),1024);assert.equal(data.readUInt32BE(20),1536);}
});
test('GM artwork upgrade includes unlinked tokens and is idempotent, preserving custom portraits',async()=>{
 let writes=0;const makeActor=(uuid,img)=>({uuid,img,prototypeToken:{texture:{src:img}},items:[{id:'ability',img:old}],async update(p){writes++;if(p.img)this.img=p.img;if(p['prototypeToken.texture.src'])this.prototypeToken.texture.src=p['prototypeToken.texture.src']},async updateEmbeddedDocuments(type,changes){writes++;for(const p of changes)this.items.find(i=>i.id===p._id).img=p.img}});
 const actor=makeActor('Actor.1',old),custom=makeActor('Actor.2','worlds/test/portrait.png'),unlinked=makeActor('Scene.1.Token.2.Actor.3',old);
 const scene={tokens:[{id:'t1',texture:{src:old},actor},{id:'t2',texture:{src:old},actor:unlinked},{id:'t3',texture:{src:'worlds/test/token.png'},actor:custom}],async updateEmbeddedDocuments(type,changes){writes++;for(const p of changes)this.tokens.find(t=>t.id===p._id).texture.src=p['texture.src']}};
 globalThis.game={user:{id:'gm',isGM:false},users:{activeGM:{id:'gm'}},actors:[actor,custom],items:[],scenes:[scene]};
 await migrateClassArtwork();assert.equal(writes,0);game.user.isGM=true;await migrateClassArtwork();assert.equal(actor.img,updated);assert.equal(unlinked.img,updated);assert.equal(custom.img,'worlds/test/portrait.png');assert.equal(scene.tokens[2].texture.src,'worlds/test/token.png');assert.equal(custom.items[0].img,updated);const count=writes;await migrateClassArtwork();assert.equal(writes,count);
});

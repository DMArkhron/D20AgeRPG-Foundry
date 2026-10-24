import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('every bestiary portrait is a distinct, complete JPEG',()=>{
 const docs=JSON.parse(readFileSync(new URL('../content/bestiary.json',import.meta.url)));
 const images=new Set();
 for(const doc of docs){
  assert.match(doc.img,/^systems\/d20age\/assets\/creatures\/[a-f0-9]+\.jpg$/);
  const path=new URL('../'+doc.img.replace('systems/d20age/',''),import.meta.url);
  const bytes=readFileSync(path);
  assert.equal(bytes.readUInt16BE(0),0xffd8,doc.name);
  assert.equal(bytes.readUInt16BE(bytes.length-2),0xffd9,doc.name);
  assert.ok(bytes.length>10000,doc.name);
  images.add(doc.img);
 }
 assert.equal(images.size,docs.length);
});

test('arcanist artwork has a complete PNG data stream',()=>{
 const bytes=readFileSync(new URL('../assets/classes/arcanist.png',import.meta.url));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.subarray(-8,-4).toString(),'IEND');
});

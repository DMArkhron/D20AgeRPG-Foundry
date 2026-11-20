import test from 'node:test';
import assert from 'node:assert/strict';
import {classAvailable} from '../scripts/homebrew.mjs';
import {progression} from '../scripts/rules.mjs';
import {readFileSync} from 'node:fs';
test('as classes opcionais exigem homebrew e preservam as tabelas de progressão',()=>{
 for(const id of ['druid','paladin','yogi']){
  assert.equal(classAvailable(id,false),false);
  assert.equal(classAvailable(id,true),true);
  assert.ok(readFileSync(new URL(`../assets/classes/${id}.png`,import.meta.url)).length>10000);
 }
 assert.equal(classAvailable('fighter',false),true);
 assert.deepEqual(progression('druid',9).slots,[2,2,2,2,1]);
 assert.equal(progression('paladin',4).saves.death,8);
 assert.equal(progression('yogi',10).thac0,10);
});

test('retratos homebrew apontam a tokens circulares existentes',async()=>{
 const {roundTokenPath,prepareDefaultToken}=await import('../scripts/tokens.mjs');
 for(const id of ['druid','paladin','yogi']){
  const img=`systems/d20age/assets/classes/${id}.png`;
  const token=roundTokenPath(img);
  assert.equal(token,`systems/d20age/assets/tokens/${id}.svg`);
  assert.match(readFileSync(new URL(`../assets/tokens/${id}.svg`,import.meta.url),'utf8'),/clipPath/);
  let update;
  prepareDefaultToken({type:'character',updateSource:data=>{update=data;}},{img});
  assert.equal(update['prototypeToken.texture.src'],token);
 }
});

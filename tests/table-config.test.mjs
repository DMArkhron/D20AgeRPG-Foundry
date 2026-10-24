import test from 'node:test';
import assert from 'node:assert/strict';
import './foundry-stub.mjs';
import {validateTokenPreferences,tokenChanges,applySelectedTokenPreferences,registerTokenPreferences,TOKEN_DEFAULTS,saveNativeRulerSettings} from '../scripts/table-config.mjs';
test('token preferences reject invalid visibility and support hiding HP',()=>{
 assert.throws(()=>validateTokenPreferences({...TOKEN_DEFAULTS,displayBars:99}));
 assert.equal(tokenChanges(validateTokenPreferences({...TOKEN_DEFAULTS,hpBar:false}))['bar1.attribute'],null);
});
test('selected-token updates require GM and do not touch unselected tokens',async()=>{
 let updates;globalThis.game={user:{isGM:false}};
 globalThis.canvas={tokens:{controlled:[{document:{id:'one',actor:{type:'character'}}},{document:{id:'party',actor:{type:'party'}}}]},scene:{async updateEmbeddedDocuments(type,data){updates=data}}};
 await assert.rejects(applySelectedTokenPreferences(TOKEN_DEFAULTS),/mestre/);
 game.user.isGM=true;assert.equal(await applySelectedTokenPreferences(TOKEN_DEFAULTS),1);assert.equal(updates[0]._id,'one');
});
test('new-token defaults are opt-in and skip parties and other initiating users',()=>{
 let hook,updates=0,p={...TOKEN_DEFAULTS};globalThis.Hooks={on(name,fn){hook=fn}};
 globalThis.game={user:{id:'u'},settings:{register(){},get(){return p}}};registerTokenPreferences();
 const doc={actor:{type:'character'},updateSource(){updates++}};
 hook(doc,{}, {},'u');assert.equal(updates,0);p.enabled=true;hook(doc,{}, {},'other');assert.equal(updates,0);hook(doc,{}, {},'u');assert.equal(updates,1);
 doc.actor.type='party';hook(doc,{}, {},'u');assert.equal(updates,1);
});
test('native ruler changes use registered choices and retain numeric types',async()=>{
 let saved;globalThis.game={user:{isGM:true},settings:{settings:new Map([['core.gridDiagonals',{namespace:'core',key:'gridDiagonals',type:Number,choices:{0:'equal',4:'alternating'},scope:'world'}]]),get(){return 0},async set(ns,key,value){saved=value}}};
 await saveNativeRulerSettings(new Map([['native.gridDiagonals','4']]));assert.equal(saved,4);
 await assert.rejects(saveNativeRulerSettings(new Map([['native.gridDiagonals','99']])),/inválida/);
});

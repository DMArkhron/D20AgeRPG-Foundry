import test from 'node:test';
import assert from 'node:assert/strict';
import './foundry-stub.mjs';
import {createWelcome,COVER,COVER_VERSION,THEME} from '../scripts/welcome.mjs';
function setup({gm=true,existing=false,otherGM=false}={}) {
 let done=false;const playlists=[],scenes=[];let activations=0;
 const doc=data=>({...data,id:`doc${Math.random()}`,getFlag(scope,key){return this.flags?.[scope]?.[key];}});
 globalThis.game={user:{id:'gm1',isGM:gm},users:{activeGM:{id:otherGM?'gm2':'gm1'}},settings:{get:()=>done,set:async(ns,key,value)=>{done=value;}},playlists,scenes};
 Object.defineProperty(scenes,'size',{get(){return this.length;}});
 if(existing)scenes.push(doc({name:'Campanha existente'}));
 globalThis.Playlist={create:async data=>{const playlist=doc(data);playlist.sounds=data.sounds.map(doc);playlist.createEmbeddedDocuments=async(type,data)=>{const sounds=data.map(doc);playlist.sounds.push(...sounds);return sounds;};playlists.push(playlist);return playlist;}};
 globalThis.Scene={create:async data=>{const scene=doc(data);scene.update=async changes=>{for(const [key,value]of Object.entries(changes)){const parts=key.split('.');let target=scene;for(const k of parts.slice(0,-1))target=target[k]??={};target[parts.at(-1)]=value;}return scene;};scene.activate=async()=>activations++;scenes.push(scene);return scene;}};
 return {playlists,scenes,activations:()=>activations};
}
test('capa vincula música em loop e não duplica em recargas',async()=>{
 const state=setup();const welcome=await createWelcome();assert.equal(welcome.scene.background.src,COVER);assert.equal(welcome.sound.path,THEME);assert.equal(welcome.sound.repeat,true);assert.equal(welcome.scene.playlist,welcome.playlist.id);assert.equal(welcome.scene.playlistSound,welcome.sound.id);assert.equal(welcome.scene.grid.type,0);assert.equal(state.activations(),1);
 await createWelcome();assert.equal(state.playlists.length,1);assert.equal(state.scenes.length,1);
});
test('campanhas existentes mantêm a cena atual e jogadores não criam conteúdo',async()=>{
 const existing=setup({existing:true});await createWelcome();assert.equal(existing.activations(),0);assert.equal(existing.scenes.length,2);
 const player=setup({gm:false});await createWelcome();assert.equal(player.scenes.length,0);
 const secondGM=setup({otherGM:true});await createWelcome();assert.equal(secondGM.scenes.length,0);
});
test('tentativa após falha parcial reutiliza playlist já criada',async()=>{
 const state=setup();const create=Scene.create;Scene.create=async()=>{throw new Error('Falha transitória');};await assert.rejects(createWelcome());assert.equal(state.playlists.length,1);
 Scene.create=create;await createWelcome();assert.equal(state.playlists.length,1);assert.equal(state.scenes.length,1);
});

test('upgrade updates only the default cover scene and retains music, tokens and campaign activation',async()=>{
 const state=setup({existing:true});const welcome=await createWelcome();welcome.scene.background.src='old.png';welcome.scene.flags.d20age.coverVersion='0.1.6';welcome.scene.tokens=[{name:'Token preservado'}];
 const sound=welcome.scene.playlistSound;await createWelcome();assert.equal(welcome.scene.background.src,COVER);assert.equal(welcome.scene.flags.d20age.coverVersion,COVER_VERSION);assert.equal(welcome.scene.playlistSound,sound);assert.equal(welcome.scene.tokens.length,1);assert.equal(state.activations(),0);assert.equal(state.scenes.length,2);
});

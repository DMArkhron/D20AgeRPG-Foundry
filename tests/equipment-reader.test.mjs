import test from 'node:test';
import assert from 'node:assert/strict';
import './foundry-stub.mjs';
import {openEquipmentEntry} from '../scripts/generator.mjs';
test('equipment reader opens the actual compendium document and never creates an item',async()=>{const previous=game;let requested,options;globalThis.game={packs:new Map([['world.d20age-equipment',{getDocument:async id=>{requested=id;return {sheet:{render:async o=>options=o}}}}]])};try{await openEquipmentEntry('rope');assert.equal(requested,'rope');assert.deepEqual(options,{force:true});game.packs.clear();await assert.rejects(()=>openEquipmentEntry('rope'),/compêndio/);}finally{globalThis.game=previous}});

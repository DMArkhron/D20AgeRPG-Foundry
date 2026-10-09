import test from 'node:test';
import assert from 'node:assert/strict';
import './foundry-stub.mjs';
import {openPortrait,choosePortrait} from '../scripts/portraits.mjs';
const apps=foundry.applications.apps;
const viewers=[],pickers=[];
apps.ImagePopout=class {constructor(options){this.options=options;viewers.push(this);}async render(){this.rendered=true;}};
apps.FilePicker={implementation:class {constructor(options){this.options=options;pickers.push(this);}async render(){this.rendered=true;}}};
test('retratos abrem no visualizador nativo sem alterar o ator',async()=>{
 const actor={name:'Aventureiro',uuid:'Actor.test',img:'portraits/hero.webp'};
 const viewer=await openPortrait(actor);assert.equal(viewer.options.src,actor.img);assert.equal(viewer.options.uuid,actor.uuid);assert.equal(viewer.rendered,true);
 actor.img='';assert.equal((await openPortrait(actor)).options.src,'systems/d20age/assets/crest.svg');
});
test('seletor troca somente img e respeita permissão na abertura e seleção',async()=>{
 const updates=[];const actor={img:'old.webp',isOwner:true,update:async data=>updates.push(data)};const sheet={actor,isEditable:true};
 const picker=await choosePortrait(sheet);assert.equal(picker.options.type,'image');assert.equal(picker.options.current,'old.webp');
 await picker.options.callback('new.webp');assert.deepEqual(updates,[{img:'new.webp'}]);
 actor.isOwner=false;await picker.options.callback('denied.webp');assert.equal(updates.length,1);
 const count=pickers.length;assert.equal(await choosePortrait(sheet),undefined);assert.equal(pickers.length,count);
 actor.isOwner=true;sheet.isEditable=false;assert.equal(await choosePortrait(sheet),undefined);assert.equal(pickers.length,count);
});

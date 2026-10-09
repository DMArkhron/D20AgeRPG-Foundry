import test from 'node:test';
import assert from 'node:assert/strict';
import {GeneratorController} from '../scripts/generator-controller.mjs';
function paper({top=0,open=false}={}){
 const body={scrollTop:top,scrollLeft:0};const details={open};
 const product={dataset:{productId:'rope'},querySelector:()=>details};
 const button={disabled:false,getAttribute:k=>({'data-action':'quantity','data-id':'rope'})[k]??null,focus(options){this.focusOptions=options}};
 return {body,details,button,ownerDocument:{activeElement:button},addEventListener(){},querySelector:s=>s==='.generator-body'?body:null,querySelectorAll:s=>s==='.generator-product'?[product]:[button]};
}
test('buying and removing preserve list position, open description, focus and existing purchases',async()=>{
 let current=paper({top:735,open:true});let controller;
 controller=new GeneratorController({equipment:[{_id:'rope',type:'equipment',system:{}}],spells:[]},{render:()=>{current=paper();controller.bind(current)}});
 controller.draft.step=4;controller.draft.cart.old=2;controller.bind(current);
 await controller.act('quantity',{id:'rope',delta:'1'});
 assert.equal(current.body.scrollTop,735);assert.equal(current.details.open,true);assert.deepEqual(current.button.focusOptions,{preventScroll:true});assert.equal(controller.draft.cart.rope,1);assert.equal(controller.draft.cart.old,2);
 await controller.act('remove',{id:'rope'});assert.equal(current.body.scrollTop,735);assert.equal(current.details.open,true);assert.equal(controller.draft.cart.old,2);
});
test('changing creation stage starts the new page at the top',async()=>{
 let current=paper({top:735});let controller;
 controller=new GeneratorController({equipment:[],spells:[]},{render:()=>{current=paper();controller.bind(current)}});controller.draft.step=4;controller.bind(current);await controller.act('back');assert.equal(current.body.scrollTop,0);assert.equal(controller.draft.step,3);
});
test('reading equipment opens its record without rebuilding the shopping page',async()=>{
 let opened=null,renders=0;const controller=new GeneratorController({equipment:[{_id:'rope'}],spells:[]},{openItem:async id=>opened=id,render:()=>renders++});controller.draft.cart.rope=2;await controller.act('open-item',{id:'rope'});assert.equal(opened,'rope');assert.equal(renders,0);assert.equal(controller.draft.cart.rope,2);
});

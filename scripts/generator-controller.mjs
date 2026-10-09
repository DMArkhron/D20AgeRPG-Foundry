import {LANGUAGE_TABLE,defaultLanguages} from './languages.mjs';
import {ATTRIBUTES,CLASSES} from './rules.mjs';
import {initialDraft,setClass,stepErrors,SKILLS,HIDDEN_SPELLS,IMPLEMENTS} from './generation.mjs';
export class GeneratorController {
 constructor(content,{actor=null,roll,render=()=>{},finish=()=>{},cancel=()=>{},openItem=()=>{}}={}){this.content=content;this.actor=actor;this.draft=initialDraft(actor);this.roll=roll;this.render=render;this.finish=finish;this.cancel=cancel;this.openItem=openItem;this.error='';this.busy=false;}
 refresh(){if(this.cancelled)return;this.viewState=this.boundStep===this.draft.step?captureGeneratorUI(this.element):null;return this.render(this.draft,{error:this.error,busy:this.busy,actor:this.actor});}
 async act(action,data={}){
  if(this.busy||this.completed||this.cancelled)return;
  this.error='';
  try{
   const d=this.draft;
   if(action==='open-item'){if(!this.content.equipment.some(i=>i._id===data.id))throw new Error('Equipamento não encontrado.');return await this.openItem(data.id);}
   if(action.startsWith('roll-')||action.startsWith('random-')){this.busy=true;await this.refresh();}
   if(action==='cancel'){this.cancelled=true;return this.cancel();}
   if(action==='choose-class')setClass(d,data.class);
   else if(action==='method'){
    if(!['ordered','distributed','manual'].includes(data.method))return;
    d.method=data.method;if(d.method==='distributed'&&!d.pool&&d.values){d.pool=Object.keys(ATTRIBUTES).map(k=>d.values[k]);d.assignments=Object.fromEntries(Object.keys(ATTRIBUTES).map((k,i)=>[k,i]));}
   }else if(action==='roll-attributes'){
    const values=[];for(let i=0;i<6;i++)values.push(await this.roll('3d6'));
    d.values=Object.fromEntries(Object.keys(ATTRIBUTES).map((k,i)=>[k,values[i]]));d.pool=values;d.assignments=Object.fromEntries(Object.keys(ATTRIBUTES).map((k,i)=>[k,i]));
   }else if(action==='roll-hp')d.hpDie=await this.roll(`1d${CLASSES[d.classId].die}`);
   else if(action==='roll-gold')d.goldRoll=await this.roll('3d6');
   else if(action==='random-language'){const language=LANGUAGE_TABLE[(await this.roll('1d20'))-1];d.chosenLanguages??=[];if(!d.chosenLanguages.includes(language)&&!defaultLanguages(d.classId).includes(language))d.chosenLanguages.push(language);else this.error='Idioma já selecionado. Role novamente ou escolha outro.';}
   else if(action==='random-ancestry')d.ancestry=(await this.roll('1d6'))-1;
   else if(action==='random-skill')d.skill=Object.keys(SKILLS)[(await this.roll('1d10'))-1];
   else if(action==='random-spell')d.spellId=this.content.spells.filter(i=>i.system.circle===1)[(await this.roll('1d20'))-1]._id;
   else if(action==='random-hidden')d.hiddenSpell=HIDDEN_SPELLS[(await this.roll('1d6'))-1];
   else if(action==='random-implement')d.implement=IMPLEMENTS[(await this.roll('1d8'))-1];
   else if(action==='quantity'){
    const item=this.content.equipment.find(i=>i._id===data.id);const delta=Number(data.delta);if(!item||![-1,1].includes(delta))return;
    const n=Math.max(0,Math.min(99,(d.cart[data.id]??0)+delta));d.cart[data.id]=n;
    if(!n)delete d.equipped[data.id];else if(item.type==='weapon')d.equipped[data.id]=true;
   }else if(action==='remove'){delete d.cart[data.id];delete d.equipped[data.id];}
   else if(action==='starter-kit'){
    for(const name of ['Mochila (80 cn)','Corda (50’)','Odre','Ração, 7 dias (simples)','Tochas (3)','Pederneira']){const item=this.content.equipment.find(i=>i.name===name);if(item)d.cart[item._id]=Math.max(1,d.cart[item._id]??0);}
   }else if(action==='back')d.step=Math.max(0,d.step-1);
   else if(action==='step'){
    const target=Number(data.step);if(!Number.isInteger(target)||target<0||target>5)return;
    if(target>d.step)for(let i=0;i<target;i++){const errors=stepErrors(d,this.content,i);if(errors.length){d.step=i;throw new Error(errors.join('\n'));}}
    d.step=target;
   }else if(action==='next'){
    const errors=stepErrors(d,this.content);if(errors.length)throw new Error(errors.join('\n'));d.step=Math.min(5,d.step+1);
   }else if(action==='finish'){
    const errors=stepErrors(d,this.content,5);if(errors.length)throw new Error(errors.join('\n'));
    this.busy=true;await this.refresh();try{const result=await this.finish(structuredClone(d));if(result){this.completed=true;return result;}}finally{this.busy=false;}
   }
  }catch(error){this.error=error.message??String(error);}
  this.busy=false;return this.refresh();
 }
 change(field){
  if(this.busy||this.completed||this.cancelled)return;
  const d=this.draft;
  if(field.dataset.language){const language=field.dataset.language;if(!LANGUAGE_TABLE.includes(language)||defaultLanguages(d.classId).includes(language))return;d.chosenLanguages??=[];d.chosenLanguages=field.checked?[...new Set([...d.chosenLanguages,language])]:d.chosenLanguages.filter(n=>n!==language);}
  else if(field.dataset.attribute){if(!Object.hasOwn(ATTRIBUTES,field.dataset.attribute))return;d.values??={};d.values[field.dataset.attribute]=field.value===''?null:Number(field.value);}
  else if(field.dataset.assignment){const key=field.dataset.assignment,n=field.value===''?-1:Number(field.value);const previous=d.assignments[key];const other=Object.keys(d.assignments).find(k=>k!==key&&d.assignments[k]===n);if(other)d.assignments[other]=previous;d.assignments[key]=n;}
  else if(field.dataset.equip){const doc=this.content.equipment.find(i=>i._id===field.dataset.equip);if(!doc)return;if(field.checked&&doc.type==='armor')for(const item of this.content.equipment.filter(i=>i.type==='armor'&&!!i.system.shield===!!doc.system.shield))d.equipped[item._id]=false;d.equipped[doc._id]=field.checked;}
  else if(field.dataset.field){
   const key=field.dataset.field;if(!['ancestry','skill','skillWeapon','skillLanguage','specialization','spellId','hiddenSpell','implement','hpDie','manualGold','resourceMethod','search','category','onlyTrained','name','languages','alignment','notes','portrait'].includes(key))return;
   d[key]=field.type==='checkbox'?field.checked:['ancestry','hpDie','manualGold'].includes(key)?field.value===''?null:Number(field.value):field.value;
  }
  this.error='';return this.refresh();
 }
 bind(element,{actions=false}={}){
  this.element=element;this.boundStep=this.draft.step;restoreGeneratorUI(element,this.viewState);this.viewState=null;
  element.addEventListener('change',event=>this.change(event.target));
  if(actions)element.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(target&&!target.disabled)this.act(target.dataset.action,target.dataset);});
 }
}

export function captureGeneratorUI(element){
 if(!element)return null;
 const body=element.querySelector('.generator-body');
 const active=element.ownerDocument?.activeElement;
 const fields=Array.from(element.querySelectorAll('input,select,textarea,button'));
 const identity=el=>['data-action','data-id','data-field','data-equip','data-attribute','data-assignment','name'].map(k=>el.getAttribute(k)??'').join('|');
 return {scrollTop:body?.scrollTop??0,scrollLeft:body?.scrollLeft??0,openProducts:Array.from(element.querySelectorAll('.generator-product')).filter(p=>p.querySelector('details')?.open).map(p=>p.dataset.productId),focus:fields.includes(active)?identity(active):null};
}
export function restoreGeneratorUI(element,state){
 if(!state)return;
 for(const product of element.querySelectorAll('.generator-product')){const details=product.querySelector('details');if(details)details.open=state.openProducts.includes(product.dataset.productId)}
 if(state.focus){const identity=el=>['data-action','data-id','data-field','data-equip','data-attribute','data-assignment','name'].map(k=>el.getAttribute(k)??'').join('|');const field=Array.from(element.querySelectorAll('input,select,textarea,button')).find(el=>identity(el)===state.focus);if(field&&!field.disabled)field.focus({preventScroll:true})}
 const body=element.querySelector('.generator-body');if(body){body.scrollTop=state.scrollTop;body.scrollLeft=state.scrollLeft}
}

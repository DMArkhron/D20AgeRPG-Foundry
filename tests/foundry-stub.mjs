// Contract harness only. This is not the proprietary Foundry runtime.
export class Field {constructor(options={}) {this.options=options;} defaultValue() {return structuredClone(this.options.initial ?? null);}}
export class ArrayField extends Field {constructor(element,options={}){super(options);this.element=element;} defaultValue(){return [];}}
export class SchemaField extends Field {constructor(fields) {super();this.fields=fields;} defaultValue() {return Object.fromEntries(Object.entries(this.fields).map(([key,f])=>[key,f.defaultValue()]));}}
export function defaults(Model) {return Object.fromEntries(Object.entries(Model.defineSchema()).map(([key,f])=>[key,f.defaultValue()]));}
export function setPath(object,path,value) {const keys=path.split(".");const last=keys.pop();let pointer=object;for(const key of keys) pointer=pointer[key] ??= {};pointer[last]=value;}
export class Collection extends Array {get(id){return this.find(i=>i.id===id);} get contents(){return this;}}
export class StubActor {
  constructor({name="Aventureiro",type="character",system,items=[],img=""}={}) {this.name=name;this.type=type;this.system=system;this.items=new Collection(...items);this.img=img;this.isOwner=true;this.id="actor1";for(const item of this.items)item.actor=this;}
  prepareDerivedData() {}
  getRollData(){return {};}
  async update(data) {for(const [key,value]of Object.entries(data)) setPath(this,key,value);this.prepareDerivedData();return this;}
  updateSource(data){this.lastSource=data;}
  async updateEmbeddedDocuments(type,changes){for(const change of changes){const item=this.items.get(change._id);await item.update(Object.fromEntries(Object.entries(change).filter(([k])=>k!=="_id")));}return this.items;}
  async createEmbeddedDocuments(type,items){return items;}
  async deleteEmbeddedDocuments(type,ids){this.items=this.items.filter(item=>!ids.includes(item.id));}
}
export class StubItem {
  constructor({name="Espada",type="weapon",system,id="item1"}={}) {Object.assign(this,{name,type,system,id});}
  async update(data){for(const [key,value]of Object.entries(data))setPath(this,key,value);this.actor?.prepareDerivedData();return this;}
}
class StubSheet {
  constructor(document){this.document=document;this.actor=document;this.isEditable=true;}
  async _prepareContext(){return {editable:this.isEditable};}
  async _onRender(){}
  async render(){this.rendered=true;return this;}
}
export const messages=[];
export const diceQueue=[];
export const warnings=[];
export const callbacks={};
export const registrations=[];
globalThis.Actor=StubActor;
globalThis.Item=StubItem;
globalThis.foundry={data:{fields:{NumberField:Field,StringField:Field,BooleanField:Field,SchemaField,ArrayField}},abstract:{TypeDataModel:class {}},applications:{sheets:{ActorSheetV2:StubSheet,ItemSheetV2:StubSheet},api:{ApplicationV2:StubSheet,DialogV2:{confirm:async()=>true}},apps:{DocumentSheetConfig:{registerSheet(...args){registrations.push(args);}}}}};
globalThis.CONFIG={Actor:{dataModels:{}},Item:{dataModels:{}},Combat:{}};
globalThis.Hooks={once:(key,fn)=>callbacks[key]=fn,on:(key,fn)=>callbacks[key]=fn};
globalThis.game={settings:{register(){}},user:{targets:new Set()}};
globalThis.ui={notifications:{warn:message=>warnings.push(message),error:message=>warnings.push(message)}};
globalThis.ChatMessage={getSpeaker:({actor}={})=>({actor:actor?.id}),create:async data=>{messages.push(data);return data;}};
globalThis.Roll=class {
  constructor(formula){this.formula=formula;}
  static validate(formula){return /^\d+d\d+(?:\s*[+*-]\s*-?\d+)*$/.test(formula);}
  async evaluate(){const natural=diceQueue.shift() ?? 10;this.dice=[{results:[{result:natural,active:true}]}];const addition=this.formula.match(/^[^ ]+\s+([+-]\d+)$/);this.total=natural+(addition?Number(addition[1]):0);if(this.formula.includes("* 10"))this.total=natural*10;return this;}
  async toMessage(data){messages.push({...data,formula:this.formula,total:this.total});return data;}
};

from pathlib import Path
import json,re,base64
R=Path(__file__).resolve().parents[1];O=R.parent/'output';O.mkdir(exist_ok=True)
def source(name):
 s=(R/'scripts'/name).read_text();s=re.sub(r'^import[^\n]*\n','',s,flags=re.M)
 return re.sub(r'\bexport (?=(?:const|function|class|async)\b)','',s)
def image(path):
 return 'data:image/'+('svg+xml' if path.endswith('.svg') else 'png')+';base64,'+base64.b64encode((R/path).read_bytes()).decode()
assets={f'systems/d20age/{p}':image(p) for p in ['assets/party.svg','assets/crest.svg','assets/classes/fighter.png','assets/classes/specialist.png']}
bestiary=json.loads((R/'content/bestiary.json').read_text());mule=next(a for a in bestiary if a['name'].startswith('Mula ·'))
assets[mule['img']]=image(mule['img'].replace('systems/d20age/',''))
code='''
const docs=new Map(),hooks=new Map();let serial=0,partySheet;
const game={user:{id:'gm',name:'Mestre',isGM:true},actors:[],users:[],settings:{get:()=>undefined}};game.users.activeGM=game.user;
const Hooks={on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list);}};
const ui={notifications:{info:notice,warn:notice,error:notice}};
function notice(message){document.querySelector('#notice').textContent=message;}
const fromUuid=async uuid=>docs.get(uuid);
function patch(object,data){for(const [key,value]of Object.entries(data)){const parts=key.split('.'),last=parts.pop();let cursor=object;for(const part of parts)cursor=cursor[part]??={};if(last.startsWith('-='))delete cursor[last.slice(2)];else cursor[last]=structuredClone(value);}}
class PreviewField{constructor(options={}){this.options=options;}defaultValue(){return structuredClone(this.options.initial??null);}}
class PreviewSchemaField{constructor(fields){this.fields=fields;}defaultValue(){return Object.fromEntries(Object.entries(this.fields).map(([k,v])=>[k,v.defaultValue()]));}}
class PreviewArrayField extends PreviewField{constructor(field,options){super(options);}}
class PreviewSheet{
 constructor(actor){this.actor=actor;this.document=actor;this.isEditable=true;this.element=document.querySelector('#panel');this.rendered=true;}
 async _onRender(){}
 async render(){const result=await this._renderHTML();this._replaceHTML(result,this.element);await this._onRender({},{});this.element.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',event=>this._onClickAction(event,b)));this.element.querySelectorAll('[name]').forEach(f=>f.addEventListener('change',()=>this.actor.update({[f.name]:f.value})));this.element.querySelectorAll('img').forEach(img=>{const path=img.getAttribute('src');if(assets[path])img.src=assets[path];});return this;}
}
const foundry={utils:{randomID:()=>`id${++serial}`,expandObject:x=>x},data:{fields:{NumberField:PreviewField,StringField:PreviewField,BooleanField:PreviewField,SchemaField:PreviewSchemaField,ArrayField:PreviewArrayField}},abstract:{TypeDataModel:class{}},applications:{sheets:{ActorSheetV2:PreviewSheet},api:{DialogV2:{wait:showDialog,confirm:async({content})=>confirm(content.replace(/<[^>]+>/g,''))}}}};
function showDialog(config){return new Promise(resolve=>{const modal=document.createElement('dialog');modal.className='d20age-party-dialog';const form=document.createElement('form');form.innerHTML=`<h2>${config.window.title}</h2>${config.content}<footer></footer>`;modal.append(form);document.body.append(modal);for(const entry of config.buttons){const button=document.createElement('button');button.type=entry.action==='cancel'?'button':'submit';button.textContent=entry.label;form.querySelector('footer').append(button);button.addEventListener('click',event=>{event.preventDefault();if(entry.action!=='cancel'&&!form.reportValidity())return;const value=entry.callback(event,button);modal.close();modal.remove();resolve(value);});}modal.addEventListener('cancel',()=>{modal.remove();resolve(null);});modal.showModal();});}
class Items extends Array{get(id){return this.find(i=>i.id===id);}}
function initial(Model){return Object.fromEntries(Object.entries(Model.defineSchema()).map(([k,v])=>[k,v.defaultValue()]));}
function makeItem(data,actor){const item={...structuredClone(data),id:data._id??`item${++serial}`,documentName:'Item',actor,parent:actor};item.system={...initial(D20AgeItemData),...item.system};item.uuid=actor.uuid+'.Item.'+item.id;item.toObject=()=>({_id:item.id,name:item.name,type:item.type,img:item.img,system:structuredClone(item.system)});item.sheet={render:()=>showDialog({window:{title:item.name},content:`<p>${partyEscape(item.system.description||'Sem descrição adicional.')}</p><p>Peso por unidade: ${item.system.weight} cn.</p>`,buttons:[{action:'cancel',label:'Fechar',callback:()=>null}]})};docs.set(item.uuid,item);return item;}
const Actor={create:async data=>makeActor(data)};
function makeActor(data){const actor={...structuredClone(data),id:`actor${++serial}`,documentName:'Actor',flags:data.flags??{d20age:{}},isOwner:true};actor.uuid='Actor.'+actor.id;actor.system={...initial(data.type==='party'?D20AgePartyData:D20AgeActorData),...data.system};actor.items=new Items(...(data.items??[]).map(d=>makeItem(d,actor)));actor.testUserPermission=()=>true;actor.update=async data=>{patch(actor,data);derivePreview(actor);return actor;};actor.setFlag=(s,k,v)=>actor.update({[`flags.${s}.${k}`]:v});actor.unsetFlag=(s,k)=>actor.update({[`flags.${s}.-=${k}`]:null});actor.createEmbeddedDocuments=async(type,rows)=>{const items=rows.map(r=>makeItem(r,actor));actor.items.push(...items);return items;};actor.updateEmbeddedDocuments=async(type,rows)=>{for(const row of rows)patch(actor.items.get(row._id),Object.fromEntries(Object.entries(row).filter(([k])=>k!=='_id')));return actor.items;};actor.deleteEmbeddedDocuments=async(type,ids)=>{actor.items=new Items(...actor.items.filter(i=>!ids.includes(i.id)));};actor.sheet={render:()=>notice('No Foundry, este botão abre a ficha completa de '+actor.name+'.')};docs.set(actor.uuid,actor);game.actors.push(actor);derivePreview(actor);return actor;}
function derivePreview(actor){actor.system.derived={ac:actor.system.combat?.ac??9,thac0:actor.system.combat?.thac0??19,move:{value:actor.system.movement?.base??40,category:'Carga pessoal'}};}
'''
code+='\nconst assets='+json.dumps(assets)+';\n'
code+='\n'.join(source(n) for n in ['models.mjs','party-rules.mjs','party-service.mjs','party-view.mjs'])
code+='\nconst e=partyEscape;\n'+source('party-sheet.mjs')
code+='\nasync function openPackAnimals(){notice("No Foundry, este botão abre o compêndio D20Age · Bestas de carga: camelo, cavalos de guerra, tração e cavalgada, mula e pônei. Arraste o animal escolhido para a ficha do grupo.");}\n'
code+='\nconst muleSource='+json.dumps(mule,ensure_ascii=False)+';\n'
code+='''
const fetch=async()=>({ok:true,json:async()=>[muleSource]});
const hero=makeActor({name:'Helena, a Vigília',type:'character',img:assets['systems/d20age/assets/classes/fighter.png'],system:{level:3,title:'Guerreira',hp:{value:16,max:22,temp:0},combat:{ac:4,thac0:18},coins:{cp:0,sp:15,ep:0,gp:42,pp:0}},items:[{name:'Espada longa',type:'weapon',img:assets['systems/d20age/assets/crest.svg'],system:{quantity:1,weight:60,equipped:true,description:'Espada longa de aço, marcada pelas jornadas.'}},{name:'Rações',type:'equipment',img:assets['systems/d20age/assets/party.svg'],system:{quantity:7,weight:10}}]});
const scout=makeActor({name:'Ícaro, o Andarilho',type:'character',img:assets['systems/d20age/assets/classes/specialist.png'],system:{level:2,title:'Especialista',hp:{value:9,max:11,temp:0},combat:{ac:7,thac0:19},coins:{cp:12,sp:30,ep:0,gp:18,pp:0}},items:[]});
const animal=makeActor({...muleSource,name:'Amora · Mula',flags:{d20age:{packAnimal:{profile:'mule'}}},system:{...muleSource.system,coins:{cp:0,sp:0,ep:0,gp:2400,pp:0},extraWeight:0},items:[{name:'Sela e alforjes · exemplo',type:'equipment',img:assets['systems/d20age/assets/party.svg'],system:{quantity:1,weight:300}},{name:'Provisões da expedição · exemplo',type:'equipment',img:assets['systems/d20age/assets/party.svg'],system:{quantity:5,weight:100}}]});
const party=makeActor({name:'Companhia do Castelo Distante',type:'party',img:assets['systems/d20age/assets/party.svg'],system:{members:[hero.uuid,scout.uuid],carriers:[animal.uuid],coins:{cp:0,sp:0,ep:0,gp:1200,pp:0},notes:'Objetivo: alcançar o castelo antes do inverno.\\nAmora transporta as provisões e o tesouro compartilhado.'},items:[{name:'Ídolo de pedra · exemplo',type:'equipment',img:assets['systems/d20age/assets/party.svg'],system:{quantity:1,weight:900,description:'Um ídolo encontrado nas ruínas. Escolha quem o transportará.'}},{name:'Pedras preciosas · exemplo',type:'equipment',img:assets['systems/d20age/assets/party.svg'],system:{quantity:6,weight:1,description:'Seis gemas não lapidadas. O preço fica a critério do mestre.'}}]});
partySheet=new D20AgePartySheet(party);party.sheet=partySheet;await partySheet.render();
window.demo={party,animal,hero,scout,sheet:partySheet,cargoState};
'''
style=(R/'styles/d20age.css').read_text().split('/* Companhia —')[1];style='/* Companhia —'+style
html='''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>D20Age · Ficha de grupo</title><style>body{margin:0;background:#292724;padding:25px 14px;font-family:Georgia,serif}.preview-top{max-width:1050px;margin:0 auto 18px;color:#eee;font:14px/1.6 system-ui}.preview-top b{font-size:21px}#panel{max-width:1050px;margin:auto;box-shadow:0 10px 35px #0008}#notice{position:sticky;bottom:15px;margin:20px auto 0;max-width:970px;background:#191919;color:white;border:1px solid #fff;padding:12px;font:14px/1.5 system-ui;z-index:3;min-height:21px}dialog{max-width:480px;width:calc(100% - 60px);max-height:85vh;overflow:auto;background:#f4f0e5;border:4px double #191919;color:#191919}dialog::backdrop{background:#0009}dialog footer{display:flex;gap:10px}dialog button{padding:10px;cursor:pointer}dialog input,dialog select{font-size:16px;box-sizing:border-box;width:100%}dialog input[type=checkbox]{width:auto}dialog h2{margin-top:0}'''+style+'''</style><div class="preview-top"><b>Ficha de grupo · D20Age 0.6.1</b><br>Prévia interativa: mova tesouros, moedas e equipamentos entre os integrantes e a mula.<br>Dados de demonstração; alterações ficam apenas nesta página. O ZIP contém o sistema para Foundry V13.</div><main id="panel"></main><div id="notice" role="status">Experimente transferir o ídolo para Amora: os 900 cn excedem os 800 cn livres.</div><script type="module">'''+code.replace('</script','<\\/script')+'</script></html>'
html=html.replace('#notice{position:sticky;bottom:15px;', '#notice{position:sticky;top:0;')
html=html.replace('<main id="panel"></main><div id="notice"', '<div id="notice"')
html=html.replace('livres.</div><script type="module">', 'livres.</div><main id="panel"></main><script type="module">')
(O/'d20age-grupo-previa.html').write_text(html)
print(O/'d20age-grupo-previa.html')

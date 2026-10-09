import {roundTokenPath} from './tokens.mjs';
import {GeneratorController} from './generator-controller.mjs';
import {generatorView} from './generator-view.mjs';
import {buildCharacter,GENERATOR_VERSION} from './generation.mjs';
import {escapeHTML} from './view.mjs';
let contentPromise;
export async function loadGeneratorContent(){
 if(!contentPromise)contentPromise=Promise.all(['equipment','spells'].map(async file=>{const r=await fetch(`systems/d20age/content/${file}.json`);if(!r.ok)throw new Error('Não foi possível carregar '+file+'. Reabra o gerador.');return r.json();})).then(([equipment,spells])=>({equipment,spells})).catch(error=>{contentPromise=null;throw error;});
 return contentPromise;
}
export async function applyCharacterDraft(draft,content,{actor=null,user=game.user}={}){
 if(actor){if(!actor.isOwner||actor.type!=='character'||actor.system.level!==1)throw new Error('Você precisa ser proprietário de uma ficha de personagem de nível 1.');if(actor.getFlag('d20age','characterCreation'))throw new Error('Esta ficha já foi preenchida pelo gerador. Crie outra ficha para gerar um novo personagem.');}
 else if(!user.can('ACTOR_CREATE'))throw new Error('Você não tem permissão para criar atores. Peça uma ficha vazia ao mestre.');
 const {data}=buildCharacter(draft,content,{existing:actor,userId:user.id});
 if(!actor)return Actor.create({...data,prototypeToken:{actorLink:true,bar1:{attribute:'hp'},...(data.img?{texture:{src:roundTokenPath(data.img)??data.img}}:{})}});
 const snapshot=actor.toObject();
 const updates={name:data.name,...Object.fromEntries(Object.entries(data.system).map(([k,v])=>['system.'+k,v])),'flags.d20age.characterCreation':data.flags.d20age.characterCreation,'flags.d20age.hpHistory':data.flags.d20age.hpHistory,'flags.d20age.creationOriginal':{name:snapshot.name,img:snapshot.img,system:snapshot.system}};
 if(data.img){updates.img=data.img;const old=actor.prototypeToken?.texture?.src;if(!old||old==='icons/svg/mystery-man.svg'||old.startsWith('systems/d20age/'))updates['prototypeToken.texture.src']=roundTokenPath(data.img)??data.img;}
 let created=[];
 try{created=await actor.createEmbeddedDocuments('Item',data.items);await actor.update(updates);}
 catch(error){if(created.length)await actor.deleteEmbeddedDocuments('Item',created.map(i=>i.id));throw error;}
 return actor;
}
export class D20AgeCharacterGenerator extends foundry.applications.api.ApplicationV2 {
 static DEFAULT_OPTIONS={classes:['d20age-generator'],tag:'div',position:{width:1060,height:880},window:{title:'D20Age · Gerador de personagens',resizable:true}};
 constructor({actor=null,content,...options}={}){super(options);this.actor=actor;this.controller=new GeneratorController(content,{actor,roll:async formula=>(await new Roll(formula).evaluate()).total,render:()=>this.render({force:true}),cancel:()=>this.close(),openItem:openEquipmentEntry,finish:draft=>this.finish(draft)});}
 async _renderHTML(){const template=document.createElement('template');template.innerHTML=generatorView(this.controller.draft,this.controller.content,{actor:this.actor,error:this.controller.error,busy:this.controller.busy});return template.content;}
 _replaceHTML(result,content){content.replaceChildren(result);}
 async _onRender(context,options){await super._onRender(context,options);const paper=this.element.querySelector('.generator-paper');this.controller.bind(paper);if(this.controller.busy)paper.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=true);}
 async _onClickAction(event,target){return this.controller.act(target.dataset.action,target.dataset);}
 _onClose(options){super._onClose(options);this.controller.cancelled=true;}
 async finish(draft){
  if(this.actor){const confirmed=await foundry.applications.api.DialogV2.confirm({window:{title:'Aplicar criação inicial'},classes:['d20age-tool-dialog'],content:`<p>Aplicar as escolhas revisadas a <b>${escapeHTML(this.actor.name)}</b>? Classe, atributos, PV e moedas serão substituídos. Os registros existentes serão mantidos e as novas compras e habilidades serão adicionadas.</p>`});if(!confirmed)return;}
  const actor=await applyCharacterDraft(draft,this.controller.content,{actor:this.actor});
  ui.notifications.info('D20Age · '+actor.name+' está pronto para a aventura.');await this.close();await actor.sheet.render({force:true});return actor;
 }
}
const activeGenerators=new Map();
export async function openCharacterGenerator({actor=null}={}){
 if(actor&&(!actor.isOwner||actor.type!=='character'||actor.system.level!==1))throw new Error('O gerador preenche fichas próprias de personagem de nível 1.');
 if(actor?.getFlag('d20age','characterCreation'))throw new Error('Esta ficha já foi preenchida pelo gerador. Crie outra ficha para gerar um novo personagem.');
 const key=actor?.uuid??'new';const existing=activeGenerators.get(key);if(existing?.rendered){existing.bringToFront();return existing;}
 const content=await loadGeneratorContent();const opened=activeGenerators.get(key);if(opened?.rendered){opened.bringToFront();return opened;}const app=new D20AgeCharacterGenerator({actor,content});activeGenerators.set(key,app);await app.render({force:true});return app;
}
export function addGeneratorDirectoryButton(application,html){
 const root=html instanceof HTMLElement?html:html?.[0];if(!root||root.querySelector('.d20age-generator-launch')||!game.user.can('ACTOR_CREATE'))return;
 const header=root.querySelector('.directory-header');if(!header)return;
 const button=document.createElement('button');button.type='button';button.className='d20age-generator-launch';button.innerHTML='<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Gerar personagem';button.addEventListener('click',()=>openCharacterGenerator().catch(e=>ui.notifications.error(e.message)));header.append(button);
}

export async function openEquipmentEntry(id){
 const pack=game.packs.get('world.d20age-equipment');
 if(!pack)throw new Error('O mestre precisa preparar o compêndio de Equipamentos.');
 const item=await pack.getDocument(id);
 if(!item)throw new Error('Este equipamento não está no compêndio. Peça ao mestre para preparar os registros ausentes.');
 return item.sheet.render({force:true});
}

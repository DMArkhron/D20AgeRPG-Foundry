import {partyView} from './party-view.mjs';
import {openPackAnimals} from './pack-animals.mjs';
import {PACK_PROFILES,PARTY_COINS,partyCanUse} from './party-rules.mjs';
import {requestPartyOperation,registerPartyService} from './party-service.mjs';
import {escapeHTML as e} from './view.mjs';
import {openPortrait} from './portraits.mjs';
const dialog=async(title,content)=>foundry.applications.api.DialogV2.wait({window:{title},classes:['d20age-party-dialog'],content:`<div class="party-dialog-content">${content}</div>`,buttons:[{action:'ok',label:'Confirmar',default:true,callback:(event,button)=>Object.fromEntries(new FormData(button.form))},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
const option=(value,label,selected=false)=>`<option value="${e(value)}" ${selected?'selected':''}>${e(label)}</option>`;
const field=(label,name,value='',attrs='')=>`<label>${label}<input name="${name}" value="${e(value)}" ${attrs}></label>`;
export class D20AgePartySheet extends foundry.applications.sheets.ActorSheetV2 {
 static DEFAULT_OPTIONS={classes:['d20age-party-sheet'],tag:'form',position:{width:1020,height:900},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false,handler:D20AgePartySheet.onSubmit}};
 static async onSubmit(event,form,data){if(!this.isEditable)return;const updates={};for(const key of ['name','system.notes'])if(Object.hasOwn(data.object,key))updates[key]=data.object[key];if(Object.keys(updates).length)await this.actor.update(updates);}
 async _renderHTML(){
  this._linked=(await Promise.all([...this.actor.system.members,...this.actor.system.carriers].map(uuid=>fromUuid(uuid).catch(()=>null)))).filter(Boolean);
  if(![this.actor.uuid,...this._linked.map(a=>a.uuid)].includes(this._location))this._location=this.actor.uuid;
  const template=document.createElement('template');template.innerHTML=partyView(this.actor,this._linked,{selected:this._location,tab:this._tab??'inventory'});return template.content;
 }
 _replaceHTML(result,content){content.replaceChildren(result);}
 async _onRender(context,options){await super._onRender(context,options);const paper=this.element.querySelector('.party-paper');paper.addEventListener('dragover',event=>event.preventDefault());paper.addEventListener('drop',event=>this._onDrop(event).catch(err=>ui.notifications.error(err.message)));}
 get current(){return this._linked?.find(a=>a.uuid===this._location)??this.actor;}
 async run(data){const message=await requestPartyOperation(this.actor,data);if(message)ui.notifications.info(message);return this.render({force:true});}
 async _onClickAction(event,target){try{await this.action(target.dataset);}catch(error){ui.notifications.error(error.message);}}
 async action(data){
  const action=data.action,actor=this._linked?.find(a=>a.uuid===data.actor);
  if(action==='party-section'){if(!['inventory','notes','history'].includes(data.section))return;this._tab=data.section;return this.render({force:true});}
  if(action==='location'){this._location=data.actor;this._tab='inventory';return this.render({force:true});}
  if(action==='open'){if(actor?.testUserPermission(game.user,'OBSERVER'))return actor.sheet.render({force:true});return;}
  if(action==='portrait')return openPortrait(actor);
  if(action==='item')return this.current.items.get(data.item)?.sheet.render({force:true});
  if(!this.isEditable)return;
  if(action==='recover')return this.run({action:'recover'});
  if(action==='unlink'||action==='remove-missing'){
   if(await foundry.applications.api.DialogV2.confirm({window:{title:'Remover vínculo'},content:'<p>Os pertences continuam na ficha original. Apenas o vínculo com o grupo será removido.</p>'}))return this.run({action,actor:data.actor});return;
  }
  if(action==='link'){
   const choices=Array.from(game.actors).filter(a=>['character','creature'].includes(a.type)&&(game.user.isGM||a.type==='character'&&a.isOwner)&&![...this.actor.system.members,...this.actor.system.carriers].includes(a.uuid));
   if(!choices.length)return ui.notifications.info('Não há fichas disponíveis para vincular. Crie um personagem ou animal primeiro.');
   const form=await dialog('Vincular à companhia',`<p>Personagens mantêm seus pertences. Criaturas passam a ser depósitos de carga acessíveis ao grupo.</p><label>Ficha<select name="actor">${choices.map(a=>option(a.uuid,`${a.name} · ${a.type==='creature'?'Animal / criatura':'Personagem'}`)).join('')}</select></label>${game.user.isGM?'<label><input type="checkbox" name="share" value="yes" checked> Permitir que os donos do grupo consultem esta ficha (Observador)</label>':''}`);
   if(form){await this.run({action:'link',...form});const linked=await fromUuid(form.actor);if(linked.type==='creature')await this.configureAnimal(linked);}return;
  }
  if(action==='profile')return this.configureAnimal(actor);
  if(action==='pack-animals')return openPackAnimals();
  if(action==='transfer')return this.transferDialog(this.current,data);
  if(action==='treasure'){
   const form=await dialog('Adicionar tesouro',`<p>Destino: <b>${e(this.current.name)}</b></p>${field('Nome','name','','required')}${field('Quantidade','quantity',1,'type="number" min="1" step="1" required')}${field('Peso de cada unidade (cn)','weight',0,'type="number" min="0" step="any" required')}<small>Para um item do livro, arraste-o do compêndio.</small>`);if(form)return this.run({action:'add-item',destination:this.current.uuid,...form});return;
  }
  if(action==='coins'){
   const form=await dialog('Adicionar moedas',`<p>Destino: <b>${e(this.current.name)}</b></p><label>Moeda<select name="coin">${Object.entries(PARTY_COINS).map(([k,v])=>option(k,v,k==='gp')).join('')}</select></label>${field('Quantidade','quantity',1,'type="number" min="1" step="1" required')}<p>Cada moeda pesa 1 cn, independentemente do valor.</p>`);if(form)return this.run({action:'add-coins',destination:this.current.uuid,...form});
  }
 }
 async configureAnimal(actor){
  if(!actor||!game.user.isGM)return;
  const saved=actor.flags?.d20age?.packAnimal??{},p=PACK_PROFILES[saved.profile]??saved;
  const form=await dialog('Capacidade do animal',`<p><b>${e(actor.name)}</b> · Livro Base, p.120</p><label>Tipo de animal<select name="profile">${Object.entries(PACK_PROFILES).map(([k,v])=>option(k,`${v.label} · ${v.normal} / ${v.max} cn`,saved.profile===k)).join('')}${option('custom','Capacidade personalizada',!saved.profile||saved.profile==='custom')}</select></label><p>Os perfis do livro já incluem capacidade e movimento. Os campos abaixo são usados apenas no perfil personalizado.</p>${field('Carga normal (cn)','normal',p.normal??0,'type="number" min="0"')}${field('Carga máxima (cn)','max',p.max??0,'type="number" min="0"')}${field('Movimento normal (pés)','move',p.move??actor.system.movement.base,'type="number" min="0"')}<p>Acima da carga normal, movimento pela metade. A mula mantém MV 30 até 4.000 cn.</p>${field('Cavaleiro / carga adicional (cn)','extra',actor.system.extraWeight??0,'type="number" min="0" step="any"')}<small>Some aqui o peso do cavaleiro. Selas, alforjes e outros itens registrados no inventário já entram na conta.</small>`);
  if(form)return this.run({action:'profile',actor:actor.uuid,...form});
 }
 async transferDialog(source,data,destination){
  const choices=[this.actor,...this._linked].filter(a=>a.uuid!==source.uuid&&partyCanUse(this.actor,a,game.user));
  if(!choices.length)throw Error('Vincule um personagem ou animal para transferir.');
  const item=source.items.get(data.item),available=data.coin?source.system.coins[data.coin]:item?.system.quantity;
  if(!available)throw Error('Não há quantidade disponível.');
  const form=await dialog('Transferir pertences',`<p><b>${e(data.coin?PARTY_COINS[data.coin]:item.name)}</b> · Origem: ${e(source.name)}</p><label>Destino<select name="destination">${choices.map(a=>option(a.uuid,a===this.actor?'Reserva do grupo':a.name,a.uuid===destination)).join('')}</select></label>${field(`Quantidade (disponível: ${available})`,'quantity',1,`type="number" min="1" max="${available}" step="1" required`)}<p>Os pertences saem da origem e entram no destino. A capacidade é conferida ao confirmar.</p>`);
  if(form)return this.run({action:'transfer',source:source.uuid,item:data.item,coin:data.coin,...form});
 }
 async _onDrop(event){
  event.preventDefault();if(event.d20ageHandled||!this.isEditable)return;event.d20ageHandled=true;
  let data;try{data=JSON.parse(event.dataTransfer.getData('text/plain'));}catch{return;}
  if(data.type==='Actor'){
   let a=await fromUuid(data.uuid);
   if(a?.pack){
    if(!game.user.isGM||a.type!=='creature'||!a.flags?.d20age?.packAnimal)throw Error('Importe a ficha do compêndio para o mundo antes de vinculá-la.');
    const imported=a.toObject();delete imported._id;delete imported.folder;
    a=await Actor.create(imported);data.uuid=a.uuid;
   }
   await this.run({action:'link',actor:data.uuid,share:game.user.isGM?'yes':undefined});if(a?.type==='creature')await this.configureAnimal(a);return;
  }
  if(data.type==='Item'){
   const item=await fromUuid(data.uuid);if(!item)return;
   if(item.parent?.documentName==='Actor')return this.transferDialog(item.parent,{item:item.id},this.current.uuid);
   return this.run({action:'add-item',destination:this.current.uuid,item:item.uuid,quantity:item.system.quantity||1});
  }
 }
}
export async function createParty(){
 if(!game.user.isGM)return ui.notifications.warn('O mestre cria a ficha compartilhada do grupo.');
 const form=await dialog('Nova companhia',`${field('Nome do grupo','name','Companhia de aventureiros','required')}<label><input type="checkbox" name="shared" value="yes" checked> Todos os jogadores podem gerir o inventário compartilhado</label><p>As fichas pessoais continuam respeitando suas permissões. Ajuste o acesso do grupo em “Configurar propriedade”.</p>`);
 if(!form)return;
 const actor=await Actor.create({name:form.name,type:'party',img:'systems/d20age/assets/party.svg',ownership:{default:form.shared==='yes'?3:0}});return actor.sheet.render({force:true});
}
export function registerPartyHooks(){
 registerPartyService();
 Hooks.on('renderActorDirectory',(app,html)=>{if(!game.user.isGM)return;const root=html instanceof HTMLElement?html:html?.[0];if(!root||root.querySelector('.d20age-party-create'))return;const button=document.createElement('button');button.type='button';button.className='d20age-party-create';button.innerHTML='<i class="fas fa-people-group"></i> Criar grupo';button.addEventListener('click',()=>createParty().catch(e=>ui.notifications.error(e.message)));(root.querySelector('.directory-header')??root).append(button);});
 const refresh=doc=>{const actor=doc.documentName==='Item'?doc.parent:doc;if(!actor)return;for(const party of game.actors??[]){if(party.type==='party'&&party.sheet?.rendered&&(party.system.members.includes(actor.uuid)||party.system.carriers.includes(actor.uuid)))party.sheet.render({force:true});}};
 for(const hook of ['updateActor','deleteActor','createItem','updateItem','deleteItem'])Hooks.on(hook,refresh);
}

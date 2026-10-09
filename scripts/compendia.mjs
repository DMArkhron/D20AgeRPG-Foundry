import {MECHANICS_VERSION,spellMechanicsUpdate,migrateWorldSpellMechanics} from './mechanics-migration.mjs';
import {rollInitiative} from './initiative.mjs';
import {healthAfter} from './health.mjs';
import {combatRules} from './preferences.mjs';
import {chatCard} from './chat.mjs';
import {escapeHTML} from './view.mjs';
export const CONTENT_VERSION='0.4.7';
export const PACKS=[
 ['bestiary','Bestiário','Actor'],['equipment','Equipamentos','Item'],['spells','Magias','Item'],
 ['abilities','Habilidades e perícias','Item'],['magic-items','Itens mágicos e especiais','Item'],
 ['rolltables','Tabelas roláveis','RollTable'],['references','Tabelas de consulta','JournalEntry'],['macros','Macros de aventura','Macro']
].map(([file,label,type])=>({file,label:`D20Age · ${label}`,type,name:`d20age-${file}`,collection:`world.d20age-${file}`}));
export function registerCompendia(){
 game.settings.register('d20age','mechanicsVersion',{scope:'world',config:false,type:String,default:''});
 game.settings.register('d20age','contentVersion',{scope:'world',config:false,type:String,default:''});
 game.settings.register('d20age','installContent',{name:'Preparar compêndios do Livro Base V2',hint:'Cria e atualiza os compêndios ao entrar como mestre. A revisão de descrições preserva estatísticas e retratos. Para repetir, use a macro “Preparar compêndios”.',scope:'world',config:true,type:Boolean,default:true});
}
let installing;
export async function installCompendia({force=false}={}){
 if(!game.user.isGM)throw new Error('Somente o mestre pode preparar os compêndios.');
 if(game.users?.activeGM && game.users.activeGM.id!==game.user.id)return;
 if(installing)return installing;
 if(!force && (!game.settings.get('d20age','installContent') || game.settings.get('d20age','contentVersion')===CONTENT_VERSION && game.settings.get('d20age','mechanicsVersion')===MECHANICS_VERSION))return;
 installing=performInstall();
 try{return await installing;}finally{installing=undefined;}
}
async function performInstall(){
 // Load and validate all sources before the first write. No partial writes for missing JSON.
 const folderResponse=await fetch('systems/d20age/content/folders.json');
 if(!folderResponse.ok)throw new Error('Não foi possível ler a organização dos compêndios.');
 const folders=await folderResponse.json();
 const migrationResponse=await fetch('systems/d20age/content/description-migration.json');
 if(!migrationResponse.ok)throw new Error('Não foi possível ler a revisão das descrições.');
 const migration=await migrationResponse.json();
 if(migration.revision!==CONTENT_VERSION || !migration.retired || !migration.oldHashes || !migration.oldDescriptions)throw new Error('Revisão de descrições inválida.');
 const sources=await Promise.all(PACKS.map(async spec=>{
  const response=await fetch(`systems/d20age/content/${spec.file}.json`);
  if(!response.ok)throw new Error(`Não foi possível ler ${spec.file}.json (${response.status}).`);
  const docs=await response.json();
  if(!Array.isArray(docs) || docs.some(d=>!d._id || !d.name) || new Set(docs.map(d=>d._id)).size!==docs.length)throw new Error(`Conteúdo inválido: ${spec.file}.`);
  return {spec,docs};
 }));
 const report=[];
 const root=await ensureWorldFolder('d20age-root','D20Age RPG');
 const groups={bestiary:'Criaturas',equipment:'Inventário','magic-items':'Inventário',spells:'Personagens',abilities:'Personagens',rolltables:'Referências',references:'Referências',macros:'Ferramentas'};
 const sidebar=new Map();
 for(const name of new Set(Object.values(groups)))sidebar.set(name,await ensureWorldFolder('d20age-'+name,name,root.id));
 ui.notifications.info('D20Age · Preparando os compêndios do Livro Base V2…');
 for(const {spec,docs} of sources){
  let pack=game.packs.get(spec.collection);
  if(!pack)pack=await foundry.documents.collections.CompendiumCollection.createCompendium({name:spec.name,label:spec.label,type:spec.type,package:'world',system:'d20age'});
  if(pack.documentName!==spec.type)throw new Error(`O compêndio ${spec.label} já existe com outro tipo de documento.`);
  await pack.setFolder(sidebar.get(groups[spec.file]).id);
  const index=await pack.getIndex({fields:['folder','img','prototypeToken.texture.src','flags.d20age.descriptionRevision','flags.d20age.mechanicsRevision']});
  const missing=docs.filter(doc=>!index.has(doc._id));
  const wasLocked=pack.locked;
  if(wasLocked)await pack.configure({locked:false});
  try{
   await ensurePackFolders(pack,folders[spec.file] ?? []);
   for(let offset=0;offset<missing.length;offset+=25){
    await pack.documentClass.createDocuments(missing.slice(offset,offset+25),{pack:pack.collection,keepId:true,keepEmbeddedIds:true});
   }
   // Update prose once per revision; numeric fields and custom art remain intact.
   const changes=[];
   for(const doc of docs){
    const existing=index.get(doc._id);if(!existing)continue;
    const update={_id:doc._id};
    const currentFolder=existing.folder?.id ?? existing.folder ?? null;
    if(currentFolder!==doc.folder)update.folder=doc.folder;
    if(isSystemIcon(existing.img) && existing.img!==doc.img)update.img=doc.img;
    if(needsDescription(existing)){
     if(spec.type==='Item')update['system.description']=doc.system.description;
     if(spec.type==='Actor')update['system.biography']=doc.system.biography;
     if(spec.type==='RollTable')update.description=doc.description;
     if(spec.type==='JournalEntry')Object.assign(update,{'flags.d20age.page':doc.flags.d20age.page,'flags.d20age.pdfPage':doc.flags.d20age.pdfPage});
     // Actor/Journal revisions are committed after their embedded records succeed.
     if(!['Actor','JournalEntry'].includes(spec.type))update['flags.d20age.descriptionRevision']=CONTENT_VERSION;
    }
    if(doc.type==='spell' && existing.flags?.d20age?.mechanicsRevision!==MECHANICS_VERSION){const full=await pack.getDocument(doc._id);Object.assign(update,spellMechanicsUpdate(full,doc)??{});}
    if(spec.type==='Actor' && existing.flags?.d20age?.mechanicsRevision!==MECHANICS_VERSION){const full=await pack.getDocument(doc._id);Object.assign(update,{'flags.d20age.hitPointsTemplate':doc.flags.d20age.hitPointsTemplate,'flags.d20age.hpRule':doc.flags.d20age.hpRule??'','flags.d20age.hpReference':doc.flags.d20age.hpReference,'flags.d20age.mechanicsRevision':MECHANICS_VERSION});if(full.flags?.d20age?.mechanicsRevision!==MECHANICS_VERSION)update['system.rollHPOnCreate']=doc.system.rollHPOnCreate;if(!full.system.hpFormula&&doc.system.hpFormula)update['system.hpFormula']=doc.system.hpFormula;const mean=doc.flags.d20age.hpReference;if(full.system.hp.value===mean&&full.system.hp.max===mean){update['system.hp.value']=doc.system.hp.value;update['system.hp.max']=doc.system.hp.max;}const texture=existing.prototypeToken?.texture?.src;if(!texture||texture.startsWith('systems/d20age/'))update['prototypeToken.texture.src']=doc.prototypeToken.texture.src;}
    if(Object.keys(update).length>1)changes.push(update);
   }
   for(let offset=0;offset<changes.length;offset+=25)await pack.documentClass.updateDocuments(changes.slice(offset,offset+25),{pack:pack.collection});
   if(spec.type==='Actor')for(const doc of docs){
    if(!index.has(doc._id) || missing.some(d=>d._id===doc._id))continue;
    const actor=await pack.getDocument(doc._id);
    const itemChanges=[];
    for(const item of doc.items){
     const old=actor.items.get(item._id);if(!old)continue;
     const change={_id:item._id};
     if(isSystemIcon(old.img) && old.img!==item.img)change.img=item.img;
     if(needsDescription(old))Object.assign(change,{'system.description':item.system.description,'flags.d20age.descriptionRevision':CONTENT_VERSION});
     if(Object.keys(change).length>1)itemChanges.push(change);
    }
    if(itemChanges.length)await actor.updateEmbeddedDocuments('Item',itemChanges);
    const newTraits=doc.items.filter(i=>!actor.items.get(i._id));
    if(newTraits.length)await actor.createEmbeddedDocuments('Item',newTraits,{keepId:true});
    const obsolete=(migration.retired.embedded?.[doc._id] ?? []).filter(id=>isBookRecord(actor.items.get(id)));
    if(obsolete.length)await actor.deleteEmbeddedDocuments('Item',obsolete);
    const texture=actor.prototypeToken?.texture?.src;
    if(isSystemIcon(texture) || texture==='icons/svg/mystery-man.svg'){
     if(texture!==doc.img)await actor.update({'prototypeToken.texture.src':doc.img});
    }
    if(needsDescription(actor))await actor.update({'flags.d20age.descriptionRevision':CONTENT_VERSION});
   }
   if(spec.type==='JournalEntry')for(const doc of docs){
    if(!index.has(doc._id))continue;
    const journal=await pack.getDocument(doc._id);const pages=doc.pages.filter(p=>p.type==='text');
    const additions=pages.filter(p=>!journal.pages.get(p._id));
    if(additions.length)await journal.createEmbeddedDocuments('JournalEntryPage',additions,{keepId:true});
    const updates=pages.filter(p=>journal.pages.get(p._id) && needsDescription(journal.pages.get(p._id))).map(p=>({_id:p._id,name:p.name,sort:p.sort,'text.content':p.text.content,'flags.d20age.descriptionRevision':CONTENT_VERSION}));
    // Retain facsimiles as clearly named context; repair the mislinked treasure page.
    for(const page of doc.pages.filter(p=>p.type==='image')){
     const old=journal.pages.get(page._id);if(!old || !needsDescription(journal))continue;
     const update={_id:page._id,name:page.name,sort:page.sort};
     if(old.src?.startsWith('systems/d20age/assets/reference/'))update.src=page.src;
     updates.push(update);
    }
    if(updates.length)await journal.updateEmbeddedDocuments('JournalEntryPage',updates);
    if(needsDescription(journal))await journal.update({'flags.d20age.descriptionRevision':CONTENT_VERSION});
   }
   if(spec.type==='RollTable')for(const doc of docs){
    if(!index.has(doc._id))continue;
    const table=await pack.getDocument(doc._id);
    const updates=doc.results.filter(r=>table.results.get(r._id) && needsDescription(table.results.get(r._id))).map(r=>({_id:r._id,description:r.description,'flags.d20age.text':r.flags.d20age.text,'flags.d20age.descriptionRevision':CONTENT_VERSION}));
    if(updates.length)await table.updateEmbeddedDocuments('TableResult',updates);
   }
   const obsolete=[];
   for(const id of migration.retired[spec.file] ?? []){
    if(index.has(id) && isBookRecord(await pack.getDocument(id)))obsolete.push(id);
   }
   if(obsolete.length)await pack.documentClass.deleteDocuments(obsolete,{pack:pack.collection});
  }finally{if(wasLocked)await pack.configure({locked:true});}
  report.push({name:spec.label,created:missing.length,total:docs.length});
  ui.notifications.info(`${spec.label}: ${docs.length} registros preparados.`);
 }
 await repairImportedDescriptions(sources,migration);
 await migrateWorldSpellMechanics(sources.find(s=>s.spec.file==='spells').docs);
 await game.settings.set('d20age','mechanicsVersion',MECHANICS_VERSION);
 await game.settings.set('d20age','contentVersion',CONTENT_VERSION);
 ui.notifications.info('D20Age · Compêndios preparados. Abra a aba Compêndios.');
 return report;
}
function needsDescription(document){return document.flags?.d20age?.descriptionRevision!==CONTENT_VERSION;}
function isBookRecord(document){return document?.flags?.d20age?.source==='d20age RPG - LB (V2)';}
// Repair already dragged copies only when their text is an exact known old
// description. Custom writing is retained, even when the source UUID matches.
export async function repairImportedDescriptions(sources,migration){
 const lookup=new Map();
 // Exact string matching also works for Foundry sessions accessed over HTTP,
 // where the browser may not expose SubtleCrypto.
 const remember=(hash,match)=>{const text=migration.oldDescriptions[hash];if(text)lookup.set(text,[...(lookup.get(text) ?? []),match]);};
 for(const {spec,docs} of sources)for(const doc of docs){
  const value=spec.type==='Item'?doc.system.description:spec.type==='Actor'?doc.system.biography:null;
  if(!value)continue;
  for(const hash of migration.oldHashes[spec.file]?.[doc._id] ?? [])remember(hash,{value,name:doc.name,type:doc.type,path:spec.type==='Item'?'system.description':'system.biography'});
  if(spec.type==='Actor')for(const item of doc.items)for(const hash of migration.oldHashes['embedded:'+doc._id]?.[item._id] ?? [])remember(hash,{value:item.system.description,name:item.name,type:item.type,path:'system.description',actorName:doc.name,actorId:doc._id});
 }
 async function changes(document,actor=null){
  const path=document.documentName==='Actor'?'system.biography':'system.description';
  const old=path==='system.biography'?document.system?.biography:document.system?.description;
  if(!isBookRecord(document) || !old)return null;
  const matches=(lookup.get(old) ?? []).filter(m=>m.path===path && m.name===document.name && m.type===document.type && (!m.actorName || actor?.name===m.actorName || actor?.flags?.core?.sourceId?.endsWith('.'+m.actorId)));
  // Identical old breath descriptions existed in several dragon variants.
  // Never choose another variant when the parent identity cannot disambiguate.
  if(!matches.length || new Set(matches.map(m=>m.value)).size!==1)return null;
  const match=matches[0];
  return {_id:document.id ?? document._id,[path]:match.value,'flags.d20age.descriptionRevision':CONTENT_VERSION};
 }
 for(const item of game.items ?? []){const update=await changes(item);if(update)await item.update(update);}
 const actors=new Set(game.actors ?? []);
 for(const scene of game.scenes ?? [])for(const token of scene.tokens ?? [])if(!token.actorLink && token.actor)actors.add(token.actor);
 for(const actor of actors){
  const actorUpdate=await changes(actor);if(actorUpdate)await actor.update(actorUpdate);
  const updates=[];
  for(const item of actor.items ?? []){const update=await changes(item,actor);if(update)updates.push(update);}
  if(updates.length)await actor.updateEmbeddedDocuments('Item',updates);
 }
}
export function isSystemIcon(img){return !img || img==='systems/d20age/assets/crest.svg' || img.startsWith('systems/d20age/assets/icons/');}
async function ensureWorldFolder(key,name,parent=null){
 let folder=game.folders.find(f=>f.type==='Compendium' && f.getFlag('d20age','organizationKey')===key);
 if(!folder)folder=await Folder.create({name,type:'Compendium',folder:parent,sorting:'a',color:'#373737',flags:{d20age:{organizationKey:key}}});
 return folder;
}
async function ensurePackFolders(pack,folders){
 // Create each depth in order, so parent folders exist before their children.
 for(let depth=0;depth<3;depth++){
  const missing=folders.filter(f=>f.flags.d20age.path.split('/').length===depth+1 && !pack.folders.has(f._id));
  if(missing.length)await Folder.createDocuments(missing,{pack:pack.collection,keepId:true});
 }
}
async function select(title,choices){
 return foundry.applications.api.DialogV2.prompt({window:{title},classes:['d20age-tool-dialog'],rejectClose:false,content:`<label>Escolha um registro<select name="choice">${choices.map(([value,label])=>`<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join('')}</select></label>`,ok:{label:'Continuar',callback:(event,button)=>button.form.elements.choice.value}});
}
export function selectedActor(){
 const tokens=canvas?.tokens?.controlled ?? [];
 if(tokens.length>1)throw new Error('Selecione apenas um token.');
 const actor=tokens[0]?.actor ?? game.user.character;
 if(!actor)throw new Error('Selecione um token ou defina seu personagem.');
 if(!actor.isOwner)throw new Error('Você precisa ter permissão de proprietário para usar esta ficha.');
 return actor;
}
export async function rollBookTable(name){
 const spec=PACKS.find(p=>p.file==='rolltables');const pack=game.packs.get(spec.collection);
 if(!pack)throw new Error('Os compêndios ainda não foram preparados pelo mestre.');
 const index=await pack.getIndex();let entry;
 if(name)entry=index.find(d=>d.name===name);
 else{
  const id=await select('Tabelas do Livro Base V2',Array.from(index).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(d=>[d._id,d.name]));
  if(!id)return;entry=index.get(id);
 }
 if(!entry)throw new Error(`Tabela não encontrada: ${name}.`);
 const table=await pack.getDocument(entry._id);const {roll,results}=await table.roll({recursive:false});
 const description=results.map(r=>r.flags.d20age?.text ?? r.description).join('\n');
 return roll.toMessage({speaker:ChatMessage.getSpeaker(),content:chatCard({type:'generation',title:table.name,rows:[['Dado',table.formula],['Resultado',roll.total]],description,footnote:table.description})});
}
export async function openBookReference(){
 const pack=game.packs.get('world.d20age-references');if(!pack)throw new Error('Os compêndios ainda não foram preparados.');
 const index=await pack.getIndex();const id=await select('Consultar tabelas',Array.from(index).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(d=>[d._id,d.name]));
 if(id)return (await pack.getDocument(id)).sheet.render({force:true});
}
export async function numberPrompt(title,label,initial=0,min=-100,max=100){
 const result=await foundry.applications.api.DialogV2.prompt({window:{title},classes:['d20age-tool-dialog'],rejectClose:false,content:`<label>${escapeHTML(label)}<input type="number" name="amount" value="${initial}" min="${min}" max="${max}" step="1" autofocus></label>`,ok:{label:'Aplicar',callback:(event,button)=>button.form.elements.amount.valueAsNumber}});
 if(result===null || result===undefined)return null;
 if(!Number.isInteger(result) || result<min || result>max)throw new Error('Informe um número inteiro dentro do intervalo indicado.');
 return result;
}
export async function adventureTool(tool){
 if(tool==='table')return rollBookTable();
 if(tool==='reference')return openBookReference();
 if(tool==='install')return installCompendia({force:true});
 if(tool==='chance'){
  const chance=await numberPrompt('Chance em seis','Sucesso em até quantas faces do d6?',2,0,6);if(chance===null)return;
  const roll=await new Roll('1d6').evaluate();return roll.toMessage({content:chatCard({title:'Chance em seis',rows:[['Chance',`${chance}:6`],['Lance',roll.total]],outcome:roll.total<=chance?'O evento acontece':'O evento não acontece'})});
 }
 if(tool==='d66')return rollBookTable('Traços e peculiaridades');
 if(tool==='turn' || tool==='period'){
  if(!game.user.isGM)throw new Error('Somente o mestre pode avançar o tempo do mundo.');
  const seconds=tool==='turn'?combatRules().turnMinutes*60:21600;await game.time.advance(seconds);
  return ChatMessage.create({content:chatCard({title:'Relógio de aventura',outcome:tool==='turn'?`Um turno passou · ${combatRules().turnMinutes} minutos`:'Um período passou · 6 horas',footnote:'Atualize luz, encontros e recursos conforme a ficção.'})});
 }
 const actor=selectedActor();
 if(tool==='charges'){
  const items=Array.from(actor.items).filter(i=>i.system.charges?.max>0);
  if(!items.length)throw new Error('A ficha não possui itens com cargas.');
  const id=await select('Usar carga de item',items.map(i=>[i.id,`${i.name} · ${i.system.charges.value}/${i.system.charges.max}`]));if(!id)return;
  const item=actor.items.get(id);const amount=await numberPrompt('Cargas · '+item.name,'Quantas cargas o efeito consome?',1,1,item.system.charges.max);if(amount===null)return;
  if(item.system.charges.value<amount)throw new Error('Cargas insuficientes.');
  await item.update({'system.charges.value':item.system.charges.value-amount});return item.sendDescription();
 }
 if(tool==='initiative')return rollInitiative({actor});
 if(tool==='morale')return actor.rollMorale();
 if(tool==='save'){
  const id=await select('Salvaguarda',[['death','Morte'],['contact','Contato'],['paralysis','Paralisia'],['eruption','Irrupção'],['spell','Feitiço']]);if(id)return actor.rollSave(id);return;
 }
 if(tool==='description' || tool==='attack'){
  const items=Array.from(actor.items).filter(i=>tool==='description' || i.type==='weapon');
  if(!items.length)throw new Error('A ficha não tem registros deste tipo.');
  const id=await select(tool==='attack'?'Escolher ataque':'Enviar descrição',items.map(i=>[i.id,i.name]));if(!id)return;
  return tool==='attack'?actor.items.get(id).rollAttack():actor.items.get(id).sendDescription();
 }
 if(tool==='hp'){
  const amount=await numberPrompt('Vida · '+actor.name,'Alteração de PV (negativo: dano; positivo: cura)',0,-10000,10000);if(amount===null)return;
  const old=actor.system.hp.value;const hp=healthAfter(actor.system.hp,Math.abs(amount),amount<0?'damage':'heal');const value=hp.value;await actor.update({'system.hp.value':value,'system.hp.temp':hp.temp});
  return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:chatCard({title:'Vida · '+actor.name,rows:[['Antes',old],['Alteração',amount],['Agora',value]],outcome:value<0?'PV abaixo de zero · resolver morte com o mestre':value===0?'Incapacitado':'',footnote:'O sistema preserva PV negativos. Esta macro não resolve morte automaticamente.'})});
 }
 if(tool==='fatigue')return actor.update({'system.conditions.fatigue':!actor.system.conditions.fatigue});
 if(tool==='exhaustion'){
  const value=await numberPrompt('Exaustão · '+actor.name,'Nível de exaustão',actor.system.conditions.exhaustion,0,6);if(value!==null)return actor.update({'system.conditions.exhaustion':value});return;
 }
 throw new Error('Ferramenta desconhecida.');
}

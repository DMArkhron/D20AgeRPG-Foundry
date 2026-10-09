import {GeneratorController} from '../scripts/generator-controller.mjs';
import {memoryModeUpdate,memoryStepUpdate} from '../scripts/memorization.mjs';
import {spellGroupUpdate,spellStepUpdate} from '../scripts/spell-editor.mjs';
import {generatorView} from '../scripts/generator-view.mjs';
import {buildCharacter} from '../scripts/generation.mjs';
import {itemDescriptionCard} from "../scripts/descriptions.mjs";
import {commonCreatureSave,adjustmentUpdate} from "../scripts/adjustments.mjs";
import {chatCard} from "../scripts/chat.mjs";
import {actorView,itemView} from "../scripts/view.mjs";
import {deriveActor,SAVES} from "../scripts/rules.mjs";
const samples=await (await fetch("./sample.json")).json();
const generatorContent=Object.fromEntries(await Promise.all(["equipment","spells"].map(async n=>[n,await (await fetch("../content/"+n+".json")).json()])));
let actor=structuredClone(samples.fighter),tab="attributes",openItem=null,spellTab='basic';
globalThis.game={settings:{get:()=>undefined},combat:{combatants:[]}};
const form=document.querySelector("#sheet");
const status=message=>document.querySelector("#status").textContent=message;
function render(){actor.system.derived=deriveActor(actor.type,actor.system,actor.items);form.innerHTML=openItem ? itemView(openItem,{spellTab}) : actorView(actor,{tab,style:document.querySelector("#sheet-style").value});document.querySelector("#back-character").disabled=!openItem;}
document.querySelector("#sheet-style").addEventListener("change",()=>{document.querySelector(".preview-window").classList.toggle("d20age-ink-sheet",document.querySelector("#sheet-style").value === "ink");render();});
function set(object,path,value){const keys=path.split(".");let ref=object;for(const key of keys.slice(0,-1))ref=ref[key]??= {};ref[keys.at(-1)]=value;}
document.querySelector("#example").addEventListener("change",event=>{actor=structuredClone(samples[event.target.value]);openItem=null;render();});
form.addEventListener("change",event=>{const field=event.target;if(!field.name)return;const record=openItem??actor;set(record,field.name,field.type==="number" ? Number(field.value) : field.type==="checkbox" ? field.checked : field.value);if(openItem?.type==='spell'){openItem.system.used=Math.min(openItem.system.used,openItem.system.memorized);openItem.system.preparedCircle=Math.max(openItem.system.circle,openItem.system.preparedCircle);}render();status("Campo atualizado apenas nesta prévia. Para usar em jogo, instale o sistema no Foundry.");});
form.addEventListener("click",event=>{
  const button=event.target.closest("[data-action]");if(!button)return;
  const action=button.dataset.action,item=actor.items.find(item=>item.id===button.dataset.itemId);
  if(action==='spell-tab'){spellTab=button.dataset.tab;render();return;}
  if(action==='spell-group'||action==='spell-step'||action==='spell-formula'){
    if(!openItem)return;const updates=action==='spell-group'?spellGroupUpdate(openItem,button.dataset.group):action==='spell-step'?spellStepUpdate(openItem.system,button.dataset):{[button.dataset.path]:button.dataset.formula};
    for(const [path,value] of Object.entries(updates??{}))set(openItem,path,value);render();return;
  }
  if(action==='memory-mode'||action==='memory-step'){
    const updates=action==='memory-mode'?memoryModeUpdate(actor.system,button.dataset.manual==='true'):memoryStepUpdate(actor.system,button.dataset);
    for(const [path,value] of Object.entries(updates??{}))set(actor,path,value);render();return;
  }
  if(action==='initiative-individual'||action==='initiative-group'){
    actor.uuid??='Actor.preview';const die=1+Math.floor(Math.random()*6);game.combat.combatants=[{actor,initiative:die}];render();status(`Demonstração: iniciativa ${die}. No Foundry, o token entra no rastreador de combate.`);return;
  }
  if(action==="generate"){launchPreviewGenerator();return;}
  if(action==="creature-save"){const updates=commonCreatureSave(button.closest(".creature-save").querySelector("input").value);for(const [path,value] of Object.entries(updates))set(actor,path,value);render();return;}
  if(action==="portrait-view"){
    document.querySelector("#portrait-image").src=actor.img;document.querySelector("#portrait-title").textContent=actor.name;document.querySelector("#portrait-viewer").showModal();return;
  }
  if(action==="section"){tab=button.dataset.section;openItem=null;render();return;}
  if(action==="item-create"){
    const kind=button.dataset.type;
    const template=Object.values(samples).flatMap(sample=>sample.items).find(record=>record.type===kind) ?? samples.fighter.items.find(record=>record.type==="weapon");
    const created=structuredClone(template);created.id=`preview-${Date.now()}`;created.name="Novo registro";created.type=kind;Object.assign(created.system,{description:"",properties:"",quantity:1,equipped:false,memorized:0,used:0,spellDamage:'',spellHealing:'',spellTemporary:'',spellScaling:'none',effectAC:0,effectSave:0,effectHP:0,effectAttack:0,effectDamage:0});actor.items.push(created);openItem=created;spellTab='basic';render();status("Novo registro criado nesta prévia. Use Voltar à ficha para retornar.");return;
  }
  if(action==="item-chat"){const record=openItem ?? item;if(record){document.querySelector("#chat-preview").insertAdjacentHTML("afterbegin",itemDescriptionCard(record));status("Descrição enviada ao chat de demonstração, abaixo da ficha.");}return;}
  if(action==="item-edit"){openItem=item;spellTab='basic';render();status("Registro de item. Use Voltar à ficha para retornar.");return;}
  if(action==="item-equip"){item.system.equipped=!item.system.equipped;render();return;}
  if(action==="item-delete"){actor.items=actor.items.filter(i=>i!==item);render();return;}
  if(action==="adjust-step" || action==="adjust-reset"){const record=openItem??actor;const updates=openItem?{[button.dataset.path]:openItem.system[button.dataset.path.slice(7)]+Number(button.dataset.delta)}:adjustmentUpdate(actor.system,button.dataset);if(updates)for(const [path,value] of Object.entries(updates))set(record,path,value);render();return;}
  if(action==="save"){const save=actor.system.derived.saves[button.dataset.save];const die=1+Math.floor(Math.random()*20);status(`Demonstração: ${SAVES[button.dataset.save]} · ${die} + ${save.bonus} contra ${save.target} · ${die+save.bonus>=save.target ? "sucesso" : "falha"}.`);return;}
  status("Este botão executa a ação completa dentro do Foundry. A prévia demonstra a apresentação da ficha.");
});
document.querySelector("#back-character").addEventListener("click",()=>{openItem=null;render();status("Ficha de personagem.");});
render();

document.querySelector("#chat-preview").innerHTML=[chatCard({type:"attack",title:"Espada longa",subtitle:"Ataque",rows:[["TAC0",19],["CA atingida",5],["Bônus","+1"]],outcome:"Acerto"}),chatCard({type:"save",title:"Morte",subtitle:"Salvaguarda",rows:[["Alvo",12],["Bônus","+0"]],outcome:"Falha"}),chatCard({type:"spell",title:"Luz",subtitle:"Conjuração",rows:[["Círculo",1],["Duração","6 turnos"]],description:"Uma luz ilumina o caminho dos aventureiros.\nA mesa determina alcance e efeitos conforme a descrição da magia.",resource:{label:'Memorizações restantes',value:0},footnote:"Exemplo fictício de apresentação."})].join("");

form.addEventListener("contextmenu",event=>{
 if(!event.target.closest(".portrait-button"))return;
 event.preventDefault();document.querySelector("#portrait-file").click();
});
document.querySelector("#portrait-file").addEventListener("change",event=>{
 const file=event.target.files?.[0];if(!file)return;
 const reader=new FileReader();reader.addEventListener("load",()=>{actor.img=reader.result;render();status("Retrato alterado apenas nesta prévia.");});reader.readAsDataURL(file);event.target.value="";
});
document.querySelector("#portrait-close").addEventListener("click",()=>document.querySelector("#portrait-viewer").close());

function launchPreviewGenerator(){
 let modal=document.querySelector('#creation-modal');if(!modal){modal=document.createElement('dialog');modal.id='creation-modal';modal.className='d20age-generator';Object.assign(modal.style,{padding:'0',width:'min(1080px,95vw)',height:'90vh',maxWidth:'95vw',maxHeight:'90vh',border:'2px solid #222'});document.body.append(modal);}
 const roll=async formula=>{const m=formula.match(/(\d+)d(\d+)/);return Array.from({length:Number(m[1])},()=>1+Math.floor(Math.random()*Number(m[2]))).reduce((a,b)=>a+b,0)};
 const controller=new GeneratorController(generatorContent,{roll,render:(draft,ctx)=>{modal.innerHTML=generatorView(draft,generatorContent,{...ctx,image:path=>typeof previewGeneratorImages==='undefined'?'../'+path.replace('systems/d20age/',''):previewGeneratorImages[path]??path});controller.bind(modal.querySelector('.generator-paper'),{actions:true});},cancel:()=>modal.close(),finish:async draft=>{const {data}=buildCharacter(draft,generatorContent);const defaults=structuredClone(samples.fighter.system);Object.assign(defaults,data.system);actor={...data,system:defaults,items:data.items.map((i,n)=>({...i,id:'created-'+n,system:{...structuredClone(samples.fighter.items[0].system),...i.system}}))};actor.img=draft.portrait?(typeof previewGeneratorImages==='undefined'?'../'+data.img.replace('systems/d20age/',''):previewGeneratorImages[data.img]):samples.fighter.img;tab='attributes';openItem=null;modal.close();render();status('Personagem criado somente nesta prévia. No Foundry, a ficha é gravada ao concluir.');return true}});
 modal.addEventListener('cancel',()=>controller.cancelled=true,{once:true});modal.showModal();controller.refresh();
}

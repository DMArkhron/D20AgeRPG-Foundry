from pathlib import Path
import base64,json,re
R=Path(__file__).resolve().parents[1];O=R.parent/'output';O.mkdir(exist_ok=True)
def src(name):
 s=(R/'scripts'/name).read_text();s=re.sub(r'^import[^\n]*\n','',s,flags=re.M)
 return re.sub(r'\bexport (?=(?:const|function|class)\b)|\bexport (?=async function\b)','',s)
b=json.loads((R/'content/bestiary.json').read_text())
for a in b:
 a['img']='data:image/svg+xml;base64,'+base64.b64encode((R/a['img'].replace('systems/d20age/','')).read_bytes()).decode()
code='\n'.join(src(n) for n in ['languages.mjs','preferences.mjs','rules.mjs','memorization.mjs','spell-editor.mjs','initiative.mjs','view.mjs','chat.mjs','health.mjs'])
code+='''
const game={user:{id:'gm',isGM:true,targets:new Set()},users:[],journal:[],settings:{get(){return undefined}},time:{worldTime:0}};
const ui={notifications:{error:message=>document.querySelector('#notice').textContent=message}};
const foundry={utils:{randomID:()=>crypto.randomUUID()},applications:{api:{DialogV2:{confirm:async({content})=>window.confirm(content.replace(/<[^>]*>/g,''))},ApplicationV2:class{
 constructor(){this.element=document.querySelector('#panel')}
 async _onRender(){}
 async render(){const result=await this._renderHTML();this._replaceHTML(result,this.element);await this._onRender({},{});this.element.querySelectorAll('button[data-action]').forEach(button=>button.addEventListener('click',event=>this._onClickAction(event,button)));return this;}
}}}};
class Roll{
 constructor(formula){this.formula=formula;}
 static validate(formula){return /^\\d+d\\d+(?:\\s*[+-]\\s*\\d+)?$/.test(formula)}
 async evaluate(){const m=this.formula.match(/^(\\d+)d(\\d+)(?:\\s*([+-])\\s*(\\d+))?$/);if(!m)throw Error('Fórmula inválida para a demonstração.');const values=Array.from({length:Number(m[1])},()=>1+Math.floor(Math.random()*Number(m[2])));this.total=values.reduce((a,b)=>a+b,0)+(m[3]==='-'?-1:1)*Number(m[4]??0);this.dice=[{results:values.map(result=>({result,active:true}))}];return this;}
 async toMessage(data){document.querySelector('#chat').insertAdjacentHTML('afterbegin',(data.flavor??'')+'<p class="demo-roll">'+this.formula+' → '+this.total+'</p>');}
}
const ChatMessage={getSpeaker:()=>({})};
const JournalEntry={create:async data=>{const doc={...data,async update(update){this.flags.d20age.encounterRows=update['flags.d20age.encounterRows'];}};game.journal.push(doc);return doc;}};
'''
code+='\n'+src('encounter-panel.mjs')
code+='\nconst book='+json.dumps(b,ensure_ascii=False).replace('<','\\u003c')+';\n'
code+='const baseline='+json.dumps(json.loads((R/'preview/sample.json').read_text())['creature']['system'],ensure_ascii=False).replace('<','\\u003c')+';\n'
code+='''
function asActor(source){const system=structuredClone(baseline);for(const [key,value] of Object.entries(source.system)){if(value&&typeof value==='object'&&!Array.isArray(value))system[key]={...system[key],...value};else system[key]=value;}const items=source.items.map(item=>({...item,id:item._id,system:{quantity:1,carried:true,equipped:true,weight:0,attackBonus:0,damageBonus:0,mode:'melee',...item.system}}));system.derived=deriveActor('creature',system,items);return {...source,system,items,uuid:'Compendium.demo.'+source._id,isOwner:true,sheet:{render:()=>window.alert(source.name+'\\n\\n'+source.system.biography)}}}
const fromUuid=async uuid=>{const source=book.find(a=>uuid.endsWith(a._id));return source?asActor(source):null};
const bookSelect=document.querySelector('#bestiary');for(const a of book.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))){const o=document.createElement('option');o.value=a._id;o.textContent=a.name;bookSelect.append(o)}
const app=new EncounterPanel();await app.render();document.querySelector('#add').onclick=()=>app.enqueue(()=>app.add(asActor(book.find(a=>a._id===bookSelect.value)))).catch(error=>ui.notifications.error(error.message));
document.querySelector('#drag').ondragstart=event=>event.dataTransfer.setData('text/plain',JSON.stringify({type:'Actor',uuid:'Compendium.demo.'+bookSelect.value}));
'''
css=(R/'styles/d20age.css').read_text()
def embed(m):
 p=(R/'styles'/m[1]).resolve();return 'url("data:image/svg+xml;base64,'+base64.b64encode(p.read_bytes()).decode()+'")'
css=re.sub(r'url\("([^"\n]+\.svg)"\)',embed,css)
css+='body{margin:0;background:#d4d3cd;color:#111;font-family:Georgia,serif}main{max-width:980px;margin:20px auto}.demo-bar{background:#faf9f3;border:2px solid #222;padding:18px;line-height:1.5}.demo-bar select{max-width:75%;padding:6px;color:#111;background:#fff}.demo-bar button{padding:7px;color:#111;background:#fff;border:1px solid #222}#panel{margin-top:12px}#chat{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.demo-roll{padding:10px;background:#fff;font:bold 20px monospace}#drag{display:inline-block;border:2px dashed #222;padding:10px;margin:10px;cursor:grab}'
html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>D20Age · Painel de criaturas · 0.5.1</title><style>'+css+'</style></head><body><main><section class="demo-bar"><b>PRÉVIA INTERATIVA · 0.5.1</b><p>Experimente os 162 modelos, PV por exemplar, dano, cura, ataques e notas. Rolagens demonstrativas; esta página não está conectada ao Foundry e os dados são descartados ao fechar. No sistema, o painel persiste no mundo e é exclusivo do mestre.</p><select id="bestiary" aria-label="Criatura do bestiário"></select> <button id="add">Adicionar exemplar</button><span id="drag" draggable="true">Arraste a criatura selecionada</span><p id="notice" role="status"></p></section><section class="d20age-sheet"><div id="panel"></div></section><h2>Chat de demonstração</h2><div id="chat"></div></main><script type="module">'+code.replace('</script','<\\/script')+'</script></body></html>'
(O/'d20age-painel-criaturas-previa.html').write_text(html);print(O/'d20age-painel-criaturas-previa.html')

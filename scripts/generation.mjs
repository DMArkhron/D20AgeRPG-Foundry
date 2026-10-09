import {defaultLanguages,languageLabel} from './languages.mjs';
import {CLASSES,ATTRIBUTES,SAVES,progression,modifier,deriveActor} from './rules.mjs';
export const GENERATOR_VERSION='0.3.1';
export const GENERATOR_STEPS=['Classe','Atributos','Dons e magia','Vida e recursos','Equipamentos','Nome e revisão'];
const simple=['Adaga','Machadinha','Cajado','Clava','Besta','Funda'];
const light=[...simple,'Azagaia','Espada curta','Maça'];
export const CLASS_PROFILES={
 arcanist:{tag:'Os mistérios da arcana',description:'Aprisiona magia na mente e explora segredos de outras eras.',training:'Armas simples; sem treinamento em proteções.',weapons:simple,armor:[],shield:false,page:21,abilities:[['Magia e memorização','Começa com uma magia de 1º círculo em um implemento arcano. Memoriza em uma hora, após sono ininterrupto e em intervalos de 24 horas.'],['Pesquisa e falha arcana','Pode pesquisar magia. Ferimentos ou falha em salvaguarda durante a conjuração causam falha arcana; situações arriscadas são arbitradas por SV-F.']]},
 fighter:{tag:'A arte do combate',description:'Domina armas e proteções. Uma arma escolhida recebe sua especialização.',training:'Qualquer arma, armadura e escudo.',weapons:null,armor:[8,7,6,5,4,3],shield:true,page:22,abilities:[['Especialização','No nível 1, escolha uma arma: +1 de dano. Novas especializações nos níveis 4, 7 e 10.']]},
 specialist:{tag:'Engenho e precisão',description:'Investiga com eficiência e inicia a aventura com uma perícia escolhida.',training:'Armas simples ou leves; armaduras leves.',weapons:light,armor:[8,7],shield:false,page:23,abilities:[['Investigação','Investiga duas áreas ou objetos de 10 × 10 pés por turno.'],['Perícias','Aprende uma perícia por nível.']]},
 magist:{tag:'Fé e força arcana',description:'Combina combate e magia. Seu implemento guarda uma magia oculta.',training:'Armas simples e leves; proteções leves, médias e escudos.',weapons:light,armor:[8,7,6,5],shield:true,page:24,abilities:[['Magia oculta','Escolhe uma das seis magias ocultas e a vincula a um implemento. No nível 1, tem somente o espaço oculto.'],['Falha arcana','Proteções em que possui treinamento não interferem na conjuração.']]},
 dwarf:{tag:'Pedra e resistência',description:'Aventureiro robusto de origem montanhosa, com um dom ancestral.',training:'Armas simples ou ferramentas; qualquer proteção e escudo.',weapons:[...simple,'Machado de batalha','Martelo de batalha','Machado de guerra','Martelo de guerra'],armor:[8,7,6,5,4,3],shield:true,page:26,abilities:[['Robusto','Recebe +1 PV por nível, somado ao dado de vida e à Constituição.'],['Carga e idiomas','Movimento 30 pés; sofre redução por carga apenas em sobrecarga. Fala comum e anão.']]},
 elf:{tag:'Herança das florestas',description:'Aventureiro feérico que une armas, meditação arcana e ancestralidade.',training:'Armas simples, leves e arcos; proteções leves, médias e escudos.',weapons:[...light,'Arco curto','Arco longo'],armor:[8,7,6,5],shield:true,page:27,abilities:[['Magia por meditação','Inicia com uma magia de 1º círculo; memoriza por meditação, sem necessidade de implemento.'],['Treinamento e idiomas','Pode conjurar com as proteções em que tem treinamento. Fala comum e elfo.']]},
 gnome:{tag:'Passos leves, grandes jornadas',description:'Pequeno aventureiro de bosques, com camuflagem, uma perícia e um dom ancestral.',training:'Armas simples ou leves; proteções leves, médias e escudos adaptados.',weapons:light,armor:[8,7,6,5],shield:true,page:28,abilities:[['Camuflagem','Quando imóvel, oculta-se em bosques e matas com chance 5:6; somente em sombras, 2:6.'],['Tamanho e carga','CA melhora em 1; transporte máximo 800 cn. Proteções adaptadas pesam metade. Fala comum e gnomo.']]}
};
export const ANCESTRIES={
 dwarf:['Pele-pedra: melhora a CA em 1.','+4 em SV contra venenos.','Detecta ouro ou pedras preciosas pelo odor a 60 pés.','Resiste ao cansaço: ignora a primeira fadiga.','Imune a doenças mundanas; +4 em SV contra doenças mágicas.','Visão escotópica: penumbra como luz normal.'],
 elf:['Cura o dobro ao tratar ferimentos.','Dorme percebendo as proximidades.','Visão com dobro de alcance e nitidez humana.','Imune a feitiços de encantamento.','Imune a venenos de paralisia.','Passos sem rastros; ignora a primeira penalidade de terreno com carga leve.'],
 gnome:['Arremessa pedras como funda, com +1 de acerto.','Comunica-se com animais por 1 turno/nível/dia.','Imune a feitiços de encantamento.','Pés ligeiros: movimento base de 40 pés.','Bravura: imune a medo.','Sorte: relança um d20 de ataque ou SV uma vez ao dia.']
};
export const SKILLS={
 'Acurácia':'Opera mecanismos e fechaduras com ferramentas adequadas; +4 em SV contra armadilhas.',
 'Arcanismo':'Usa itens mágicos como arcanista de metade do nível, mínimo 1.',
 'Arma':'Escolha uma arma em que tenha treinamento: +1 no acerto e dano.',
 'Decifrar':'Interpreta ruídos, comportamentos, leitura labial e textos mundanos desconhecidos com tempo.',
 'Escalar':'Escala superfícies irregulares sem equipamento; +4 em SV contra quedas.',
 'Esconder':'Oculta-se quando completamente coberto por sombras.',
 'Furtividade':'Move-se de modo praticamente inaudível; pode percorrer o dobro em exploração.',
 'Idioma':'Aprende um idioma extra.',
 'Punga':'Furta ou oculta objetos no corpo de maneira despercebida.',
 'Sobressaltar':'Surpreende com chance 4:6; +4 no acerto e dano dobrado contra surpreendidos.'
};
export const HIDDEN_SPELLS=['Exorcismo','Heroísmo','Luz','Mãos flamejantes','Proteção contra o mal','Restauração'];
export const IMPLEMENTS=['Anel','Cajado','Cetro','Cordão','Livreto','Orbe','Punhal','Varinha'];
export function initialDraft(actor=null){return {step:0,classId:actor?.system?.classId??'fighter',method:'ordered',values:null,pool:null,assignments:{},hpDie:null,goldRoll:null,manualGold:null,resourceMethod:'rolled',ancestry:null,skill:'',skillWeapon:'',skillLanguage:'',specialization:'',spellId:'',hiddenSpell:'',implement:'Livreto',cart:{},equipped:{},name:actor?.name??'',languages:'',chosenLanguages:[],alignment:'',notes:'',portrait:!actor?.img||actor.img==='systems/d20age/assets/crest.svg'};}
export function setClass(draft,id){if(!CLASSES[id])throw new Error('Classe inválida.');if(id===draft.classId)return;draft.classId=id;draft.hpDie=null;draft.ancestry=null;draft.skill='';draft.skillWeapon='';draft.specialization='';draft.spellId='';draft.hiddenSpell='';}
export function assignedAttributes(draft){
 if(draft.method==='distributed'){
  if(!draft.pool)return null;
  const indices=Object.keys(ATTRIBUTES).map(k=>Number(draft.assignments[k]??-1));
  if(indices.some(i=>!Number.isInteger(i)||i<0||i>5)||new Set(indices).size!==6)return null;
  return Object.fromEntries(Object.keys(ATTRIBUTES).map((key,i)=>[key,draft.pool[indices[i]]]));
 }
 return draft.values;
}
export function trained(classId,item){const p=CLASS_PROFILES[classId];if(item.type==='weapon')return !p.weapons||p.weapons.includes(item.name);if(item.type==='armor')return item.system.shield?p.shield:p.armor.includes(item.system.ac);return true;}
export function budget(draft){const total=draft.resourceMethod==='manual'?Number(draft.manualGold):draft.goldRoll===null?null:draft.goldRoll*10;return total;}
export function cartSummary(draft,equipment){let cost=0;let weight=0;const items=[];const issues=[];
 for(const [id,n] of Object.entries(draft.cart)){
  const doc=equipment.find(i=>i._id===id);if(!doc||!Number.isInteger(n)||n<0||n>99){issues.push('Compra inválida.');continue}if(!n)continue;
  const price=Math.round(doc.system.price*100);cost+=price*n;
  const adapted=draft.classId==='gnome'&&doc.type==='armor';const mass=(doc.system.weight??0)*(adapted?.5:1);weight+=mass*n;
  items.push({doc,quantity:n,equipped:!!draft.equipped[id],weight:mass,adapted});
 }
 const funds=budget(draft);const remaining=funds===null?null:Math.round(funds*100)-cost;
 return {cost:cost/100,remaining:remaining===null?null:remaining/100,weight,items,issues};
}
export function stepErrors(draft,content,step=draft.step){
 const errors=[];const attr=assignedAttributes(draft);const s=cartSummary(draft,content.equipment);
 if(step===0&&!CLASSES[draft.classId])errors.push('Escolha uma classe.');
 if(step===1&&!['ordered','distributed','manual'].includes(draft.method))errors.push('Método de atributos inválido.');
 if(step===1&&(!attr||Object.keys(ATTRIBUTES).some(k=>!Number.isInteger(attr[k])||attr[k]<3||attr[k]>18)))errors.push('Preencha seis atributos entre 3 e 18. Na distribuição, use cada resultado uma única vez.');
 if(step===2){
  if(ANCESTRIES[draft.classId]&&(!Number.isInteger(draft.ancestry)||draft.ancestry<0||draft.ancestry>5))errors.push('Escolha ou sorteie sua ancestralidade.');
  if(['specialist','gnome'].includes(draft.classId)){
   if(!SKILLS[draft.skill])errors.push('Escolha uma perícia inicial.');
   if(draft.skill==='Arma'&&!content.equipment.some(i=>i.name===draft.skillWeapon&&i.type==='weapon'&&trained(draft.classId,i)))errors.push('Escolha uma arma treinada para a perícia.');
   if(draft.skill==='Idioma'&&!draft.skillLanguage.trim())errors.push('Informe o idioma aprendido pela perícia.');
  }
  if(draft.classId==='fighter'&&!content.equipment.some(i=>i.name===draft.specialization&&i.type==='weapon'))errors.push('Escolha a arma de especialização.');
  if(['arcanist','elf'].includes(draft.classId)&&!content.spells.some(i=>i._id===draft.spellId&&i.system.circle===1))errors.push('Escolha sua magia de primeiro círculo.');
  if(draft.classId==='magist'&&!HIDDEN_SPELLS.includes(draft.hiddenSpell))errors.push('Escolha sua magia oculta.');
  if(['arcanist','magist'].includes(draft.classId)&&!IMPLEMENTS.includes(draft.implement))errors.push('Escolha um implemento.');
 }
 if(step===3){if(!['rolled','manual'].includes(draft.resourceMethod))errors.push('Escolha o método de recursos.');if(!Number.isInteger(draft.hpDie)||draft.hpDie<1||draft.hpDie>CLASSES[draft.classId].die)errors.push('Role o dado de vida da classe.');const funds=budget(draft);if(funds===null||!Number.isFinite(funds)||funds<0||funds>100000||Math.abs(funds*100-Math.round(funds*100))>1e-6)errors.push('Determine os recursos iniciais, com até duas casas decimais.');if(draft.resourceMethod==='rolled'&&(!Number.isInteger(draft.goldRoll)||draft.goldRoll<3||draft.goldRoll>18))errors.push('Role 3d6 para os recursos.');}
 if(step===4){errors.push(...s.issues);if(s.remaining===null)errors.push('Determine os recursos antes de comprar.');else if(s.remaining<0)errors.push('As compras ultrapassam seus recursos.');if(s.items.filter(i=>i.doc.type==='armor'&&!i.doc.system.shield&&i.equipped).length>1)errors.push('Equipe somente uma armadura.');if(s.items.filter(i=>i.doc.system.shield&&i.equipped).length>1)errors.push('Equipe somente um escudo.');}
 if(step===5){if(!draft.name.trim())errors.push('Escolha um nome.');if(draft.name.length>120)errors.push('Use um nome de até 120 caracteres.');for(let i=0;i<5;i++)errors.push(...stepErrors(draft,content,i));}
 return [...new Set(errors)];
}
export function hitPoints(draft){const attr=assignedAttributes(draft);if(!attr||draft.hpDie===null)return null;return Math.max(1,draft.hpDie+modifier(attr.con)+(draft.classId==='dwarf'?1:0));}
function cloneItem(doc){const {folder,_id,_stats,ownership,...data}=structuredClone(doc);return data;}
export function buildCharacter(draft,content,{existing=null,userId=null}={}){
 const errors=stepErrors(draft,content,5);if(errors.length)throw new Error(errors.join('\n'));
 const p=CLASS_PROFILES[draft.classId],cls=CLASSES[draft.classId],attr=assignedAttributes(draft),shopping=cartSummary(draft,content.equipment);
 const hp=hitPoints(draft);const balance=Math.round(shopping.remaining*100);const gold=Math.floor(balance/100),silver=Math.floor(balance%100/10),copper=balance%10;
 const items=shopping.items.map(row=>{
  const d=cloneItem(row.doc);Object.assign(d.system,{quantity:row.quantity,weight:row.weight,carried:d.system.carried!==false,equipped:row.equipped,damageBonus:0,attackBonus:0});
  if(row.adapted){d.system.description+='\nProteção adaptada para gnomo: metade do peso.';d.system.properties=(d.system.properties??'')+' · Adaptado';}
  if(d.type==='weapon'&&d.name===draft.specialization&&draft.classId==='fighter')d.system.damageBonus+=1;
  if(d.type==='weapon'&&d.name===draft.skillWeapon&&draft.skill==='Arma'&&['specialist','gnome'].includes(draft.classId)){d.system.damageBonus+=1;d.system.attackBonus+=1;}
  return d;
 });
 const ability=(name,text,page=p.page)=>items.push({name,type:'ability',img:`systems/d20age/assets/classes/${draft.classId}.png`,system:{description:`${text}\n\nLivro Base V2, p. ${page}.`},flags:{d20age:{generatorVersion:GENERATOR_VERSION}}});
 for(const [name,text] of p.abilities)ability(name,text);
 if(ANCESTRIES[draft.classId])ability('Ancestralidade',ANCESTRIES[draft.classId][draft.ancestry]);
 if(['specialist','gnome'].includes(draft.classId))ability('Perícia · '+draft.skill,SKILLS[draft.skill]+(draft.skill==='Arma'?' Arma escolhida: '+draft.skillWeapon+'.':draft.skill==='Idioma'?' Idioma: '+draft.skillLanguage+'.':''),29);
 if(draft.classId==='fighter')ability('Arma especializada · '+draft.specialization,'+1 de dano com '+draft.specialization+'. Bônus aplicado aos exemplares comprados neste gerador. Exemplares adquiridos depois exigem ajuste.',22);
 if(['arcanist','elf'].includes(draft.classId)){
  const spell=cloneItem(content.spells.find(i=>i._id===draft.spellId));Object.assign(spell.system,{memorized:1,preparedCircle:1,used:0});items.push(spell);
 }
 if(['arcanist','magist'].includes(draft.classId))items.push({name:'Implemento arcano · '+draft.implement,type:'equipment',img:`systems/d20age/assets/classes/${draft.classId}.png`,system:{price:0,weight:0,quantity:1,carried:true,description:'Implemento inicial concedido pela classe; não é um item de cargas.\n'+(draft.classId==='magist'?'Magia oculta: '+draft.hiddenSpell:'Magia: '+content.spells.find(i=>i._id===draft.spellId).name)+'\nMassa incluída na miscelânea; ajuste com a mesa se necessário.'}});
 const language=[...defaultLanguages(draft.classId),...(draft.chosenLanguages??[]).map(n=>languageLabel(n,draft.alignment)),...(draft.skill==='Idioma'&&['gnome','specialist'].includes(draft.classId)?[draft.skillLanguage.trim()]:[]),...(draft.languages.trim()?draft.languages.split(',').map(x=>x.trim()).filter(Boolean):[])];
 const system={classId:draft.classId,level:1,xp:0,alignment:draft.alignment??'',adventureNotes:draft.notes??'',saves:Object.fromEntries(Object.keys(SAVES).map(k=>[k,{target:progression(draft.classId,1).saves[k],bonus:0}])),attributes:Object.fromEntries(Object.keys(ATTRIBUTES).map(k=>[k,{value:attr[k],bonus:0}])),hp:{value:hp,max:hp},combat:{autoArmor:true,autoProgression:true,ac:9,thac0:cls.thac0[0],acAdjustment:draft.classId==='dwarf'&&draft.ancestry===0?-1:0,attackBonus:0},movement:{auto:!(draft.classId==='gnome'&&draft.ancestry===3),base:draft.classId==='gnome'&&draft.ancestry===3?40:cls.move},conditions:{fatigue:false,exhaustion:0},coins:{gp:gold,sp:silver,cp:copper,ep:0,pp:0},languages:[...new Set(language)].join(', '),ancestry:ANCESTRIES[draft.classId]?.[draft.ancestry]??'Humano',hiddenSpell:draft.classId==='magist'?draft.hiddenSpell:'',hiddenUsed:false,extraWeight:existing?.system.extraWeight??0,notes:[existing?.system.notes,draft.notes,`Criação: ${draft.method==='ordered'?'3d6 em ordem':draft.method==='distributed'?'3d6 distribuídos (opção da mesa)':'atributos manuais (opção da mesa)'}. Recursos: ${budget(draft)} po; compras: ${shopping.cost} po.`,draft.skill==='Arma'?'Perícia Arma: bônus aplicado somente à arma escolhida comprada no gerador.':'', 'Efeitos condicionais de ancestralidade e perícias são arbitrados pela mesa.'].filter(Boolean).join('\n')};
 const data={name:draft.name.trim(),type:'character',system,items,flags:{d20age:{hpHistory:[{level:1,classId:draft.classId,formula:`1d${cls.die}`,die:draft.hpDie,constitution:modifier(attr.con),robust:draft.classId==='dwarf'?1:0,gain:hp,at:Date.now()}],characterCreation:{version:GENERATOR_VERSION,method:draft.method,budget:budget(draft),spent:shopping.cost}}}};
 if(draft.portrait)data.img=`systems/d20age/assets/classes/${draft.classId}.png`;
 if(userId)data.ownership={[userId]:3};
 const fullSystem={...system,saves:Object.fromEntries(['death','contact','paralysis','eruption','spell'].map(k=>[k,{target:12,bonus:0}]))};
 const normalized=[...(existing?.items??[]),...items].map(i=>({...i,system:{quantity:1,carried:true,equipped:false,weight:0,magicBonus:0,...i.system}}));
 const derived=deriveActor('character',fullSystem,normalized);
 const warnings=[...derived.warnings];
 for(const row of shopping.items)if(!trained(draft.classId,row.doc))warnings.push(row.doc.name+': fora do treinamento da classe.');
 if(shopping.items.some(i=>i.doc.system.properties==='Miscelânea'&&i.doc.system.weight===0)&&!shopping.items.some(i=>i.doc.name.startsWith('Mochila')||i.doc.name.startsWith('Bolsa de cinto')))warnings.push('Miscelâneas: compre mochila/bolsa ou ajuste a carga na ficha.');
 const extras=Math.max(0,attr.int-10);if((draft.chosenLanguages??[]).length+draft.languages.split(',').filter(x=>x.trim()).length>extras)warnings.push('Idiomas informados excedem os extras de Inteligência; confira com a mesa.');
 return {data,derived,warnings,shopping};
}

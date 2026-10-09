import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=n=>JSON.parse(readFileSync(new URL(`../content/${n}.json`,import.meta.url),'utf8'));
test('every herb, vehicle and war machine contains only its own record',()=>{
 const equipment=load('equipment');const herbs=equipment.filter(d=>d.system.properties==='Erva medicinal');
 for(const herb of herbs){assert.ok(herb.system.description.length<230);for(const other of herbs.filter(x=>x!==herb))assert(!herb.system.description.includes(other.name.replace(' (dose)','')));assert.doesNotMatch(herb.system.description,/Estalagem|Pernoite|Animais/);}
 for(const d of equipment.filter(x=>[56,57].includes(x.flags.d20age.pdfPage)))assert.doesNotMatch(d.system.description,/Tabela -|DESCRIÇÕES -|VEICULOS|MAQUINAS DE GUERRA/);
 assert.match(equipment.find(i=>i.name==='Alicate').system.description,/cortes ou em braseiros/);
 assert.match(equipment.find(i=>i.name==='Óleo (frasco)').system.description,/preparo de ânforas/);
 assert.match(equipment.find(i=>i.name==='Lampião').system.description,/frasco de óleo em 2 horas/);
});
test('skills, magic items and creature traits stop at their source boundaries',()=>{
 const skills=load('abilities').filter(i=>i.system.properties==='Perícia');assert.equal(skills.length,10);
 assert.doesNotMatch(skills.find(i=>i.name==='Perícia · Escalar').system.description,/Esconder/);
 assert.doesNotMatch(skills.find(i=>i.name==='Perícia · Furtividade').system.description,/Idioma/);
 assert.doesNotMatch(load('magic-items').find(i=>i.name==='Pedra anã').system.description,/ARMAS|Armadura|Mithril/);
 for(const a of load('bestiary'))for(const i of a.items.filter(i=>i.type==='ability'))assert.doesNotMatch(i.system.description,/CA:.*DV:|GIGANTE \| GIGANTES|CONSTRUTOS|FLORANIDEOS/);
 const dragon=load('bestiary').find(i=>i.name.startsWith('Dragão azul'));const breath=dragon.items.find(i=>i.name.startsWith('Baforada'));
 assert.match(breath.system.description,/SV-C/);assert.match(breath.system.description,/100’/);assert.doesNotMatch(breath.system.description,/Branco|Verde|Vermelho|Preto/);
 const gnome=load('abilities').filter(i=>i.name==='Gnomo · Camuflagem');assert.equal(gnome.length,2);assert.equal(new Set(gnome.map(i=>i._id)).size,2);
});
test('all descriptions are covered by the audit and all reference prose is isolated and justified',()=>{
 const audit=load('description-audit');const catalog=load('catalog');assert.deepEqual(audit.counts,catalog.counts);
 assert.equal(audit.records.length,Object.values(catalog.counts).reduce((a,b)=>a+b,0));
 for(const [pack,count] of Object.entries(catalog.counts)){assert.equal(audit.records.filter(r=>r.pack===pack).length,count);for(const d of load(pack))assert.equal(d.flags.d20age.descriptionRevision,'0.4.7');}
 for(const ref of load('references')){const text=ref.pages.find(p=>p.type==='text').text.content;assert.match(text,/text-align:justify/);assert.doesNotMatch(text,/<pre>/);assert.equal(ref.pages[0].type,'text');}
 const herbReference=load('references').find(i=>i.name==='Ervas medicinais');assert.doesNotMatch(herbReference.pages[0].text.content,/Pernoite|Camelo|Estalagens/);
 const css=readFileSync(new URL('../styles/d20age.css',import.meta.url),'utf8');assert.match(css,/textarea\[name="system.description"\]/);assert.match(css,/text-align:justify/);
});

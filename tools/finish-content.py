from pathlib import Path
import json,re,hashlib,html
R=Path(__file__).resolve().parents[1]; C=R/'content'
def uid(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
def read(s):return json.loads((C/(s+'.json')).read_text())
def write(s,d): (C/(s+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
# Source-aligned names and numeric prices for wrapped magical item tables.
magic=read('magic-items')
potions=[500]*6+[1000]*2+[1500]*9+[2000]*2+[10000]
names=['Óleo da acurácia','Óleo da escalada','Óleo da proteção','Poção da restauração','Poção do amor','Poção do heroísmo','Óleo da invisibilidade','Poção da levitação','Poção da agilidade','Poção da clarividência','Poção de crescimento','Poção de diminuição','Poção da ultravisão','Poção da oclumência','Poção de respirar na água','Poção de voo','Pomada de resistência','Poção da grande restauração','Poção da sorte','Poção da juventude']
prices=dict(zip(names,potions));prices.update(dict(zip(['Cajado da arquimagia','Cajado da restauração','Cajado da serpente','Cajado de comando','Cajado do poder','Orbe de cristal','Orbe da predição','Orbe da verdade','Varinha congelante','Varinha da amarração','Varinha da detecção mágica','Varinha da chave arcana','Varinha da fechadura','Varinha da negação','Varinha da revelação','Varinha de encantamento','Varinha de flecha mágica','Varinha de luz','Varinha de paralisia','Varinha de raios','Varinha do medo','Varinha do polimorfismo','Varinha flamejante'],[275000,22500,50000,75000,125000,25000,45000,55000,50000,10000,10000,10000,20000,60000,60000,10000,10000,10000,30000,30000,40000,40000,30000])))
prices.update(dict(zip(['Água benta','Biotônico','Chá de equinácea','Chá de lixia','Elixir da montanha','Suco de mangostão','Super cola','Super solvente','Pomada de bardana','Vapor de guaco'],[25,50,25,25,50,25,25,25,50,50])))
for item in magic:
 s=item['system'];s['price']=prices.get(item['name'],s.get('price',0))
 if item['name'] in names:s['duration']='1d6+6 turnos';s['description']+='\n\nDuração padrão de poção mágica: 1d6+6 turnos (salvo efeito permanente indicado).'
 if item['name'].startswith('Varinha'):
  s['charges']={'value':20,'max':20};s['description']+='\n\nExemplar preparado com carga plena (20). Para um exemplar encontrado, o livro orienta sortear 2d10 cargas. Usar consome uma carga; não há recarga diária.'
 if item['name'].startswith(('Cajado','Orbe')):
  maxcharges=10 if item['name']=='Cajado da arquimagia' else 0 if item['name']=='Cajado da serpente' else 3
  s['charges']={'value':maxcharges,'max':maxcharges}
 if item['name']=='Escaravelhos guardiões':s['charges']={'value':7,'max':7};s['description']+='\n\nExemplar de referência com 7 cargas; para geração aleatória, use 2d6.'
 if item['name']=='Anel da reflexão mágica':s['charges']={'value':7,'max':7};s['description']+='\n\nExemplar de referência com 7 cargas; para geração aleatória, use 2d6.'
for tablename in ['Poções mundanas','Miscelâneas especiais']:
 tab=next(t for t in read('rolltables') if t['name']==tablename)
 for row in tab['results']:
  text=row['flags']['d20age']['text'];parts=text.rsplit(' ',1)
  if len(parts)==2 and re.fullmatch(r'[\d.]+',parts[1]):
   name=parts[0].replace('Vapor do guaco','Vapor de guaco')
   it=next((it for it in magic if it['name']==name),None)
   if it:it['system']['price']=int(parts[1].replace('.',''))
write('magic-items',magic)
# Fix wrapped rows in tables whose numeric cell is vertically centered across a paragraph.
tables=read('rolltables')
def rows(name,values):
 t=next(t for t in tables if t['name']==name)
 assert len(t['results'])==len(values),(name,len(t['results']),len(values))
 for r,text in zip(t['results'],values):r['description']=html.escape(text);r['flags']['d20age']['text']=text
rows('Propriedades de arma',[
 'Alvorada: +1d6 de dano em desmortos; exorcismo por comando (1×/dia).',
 'Brilhante: por comando, ilumina como tocha.',
 'Defensora: por comando, transfere seu bônus de ataque para CA e vice-versa.',
 'Devoradora: feridos viventes sofrem permanentemente um nível de exaustão; 1d4+4 cargas.',
 'Encantada: encantar pessoas por comando (1×/semana).',
 'Flamejante: por comando, funciona como tocha e causa +2 de dano.',
 'Lunar: efeito de brilhante e +1 extra em acerto e dano sob luz da lua.',
 'Mata-draco: +1d6 de dano em dracônicos.', 'Mata-gigante: +1d6 de dano em gigantes.',
 'Paralisante: feridos viventes ficam paralisados; SV-P evita, com imunidade por 24h no sucesso.',
 'Retorno: pode ser arremessada, retornando magicamente à mão.',
 'Vingadora: +1d6 de dano contra alinhamentos diferentes; sorteie o alinhamento da arma.',
 'Vorpal: natural 20 decapita alvos com cabeça de tamanho grande ou menor; caso contrário, +2d6 de dano.',
 'Nenhum efeito extra.'
])
rows('Propriedades de armadura e escudo',[
 'Alarme: brilha quando um tipo de criatura se aproxima em até 120’.',
 'Brilho: ilumina como vela por comando.', 'Defesa: armadura arcana por comando (1×/dia).',
 'Imunidade: imune aos efeitos de magias de primeiro círculo.', 'Leve: metade da massa em cn.',
 'Resistência: sorteie 1d6, 1–3 frio ou 4–6 calor, como resistência a elementos.',
 'Resistência mágica: +4 em salvaguardas contra efeitos mágicos.',
 'Restauração: efeito de restauração por comando (1×/dia).',
 'Restauração maior: efeito de grande restauração por comando (1×/dia).',
 'Nenhum efeito adicional.', 'Duas propriedades especiais: role 1d10 duas vezes e ignore 10.'
])
for t in tables:
 for r in t['results']:r['name']=r['flags']['d20age']['text'][:100]
 # Keep d66 arithmetic transparent. Do not normalize sparse ranges or 2d6 frequencies.
write('rolltables',tables)
# Drag-and-drop poison doses, fortunes and elemental stones.
abilities=read('abilities');equipment=read('equipment')
poison_table=next(t for t in tables if t['name']=='Venenos')
sourceP=json.load(open(C/'source-lines.json'));ls=sourceP['197']
for r in poison_table['results']:
 parts=r['flags']['d20age']['text'].rsplit(' ',1);name,price=parts[0],int(parts[1].replace('.',''))
 start=next(i for i,l in enumerate(ls) if l['text']==name and l['bold'] and (l['x']<40 or 225<l['x']<232))
 end=next((i for i in range(start+1,len(ls)) if ls[i]['bold'] and (ls[i]['x']<40 or 225<ls[i]['x']<232)),len(ls))
 desc=' '.join(l['text'] for l in ls[start+1:end])
 equipment.append({'_id':uid('poison'+name),'name':'Veneno · '+name,'type':'equipment','img':'systems/d20age/assets/crest.svg','system':{'price':price,'weight':0,'description':desc+'\n\nLivro Base V2, p. 192. Duração: uma semana se bem armazenado, até um ano com treinamento adequado. Aplicação e salvaguarda são resolvidas pela mesa.','properties':'Veneno; dose'},'flags':{'d20age':{'page':192,'pdfPage':197,'source':'d20age RPG - LB (V2)'}}})
for r in next(t for t in tables if t['name']=='Fortunas')['results']:
 text=r['flags']['d20age']['text'];abilities.append({'_id':uid('fortune'+text),'name':'Fortuna · '+text.split(':')[0],'type':'ability','img':'systems/d20age/assets/crest.svg','system':{'description':text+'\n\nLivro Base V2, p. 191. Aplique os modificadores em Ajustes; os efeitos não são aplicados automaticamente.','properties':'Fortuna opcional'},'flags':{'d20age':{'page':191,'pdfPage':196,'source':'d20age RPG - LB (V2)'}}})
write('abilities',abilities);write('equipment',equipment)
macros=[];scripts=R/'macros';scripts.mkdir(exist_ok=True)
def macro(name,tool=None,table=None):
 call=f'game.d20age.rollBookTable({json.dumps(table,ensure_ascii=False)})' if table else f'game.d20age.adventureTool({json.dumps(tool)})'
 command=f'try {{ await {call}; }} catch(error) {{ console.error("D20Age",error); ui.notifications.error(error.message); }}'
 id=uid('macro'+name);(scripts/(id+'.mjs')).write_text('// '+name+'\n'+command+'\n')
 macros.append({'_id':id,'name':name,'type':'script','img':'systems/d20age/assets/crest.svg','scope':'global','command':command,'flags':{'d20age':{'tool':tool or 'table','table':table,'contentVersion':'0.2.0'}}})
for name,tool in [('Consultar tabelas','reference'),('Sortear tabela','table'),('Preparar compêndios','install'),('Chance em seis','chance'),('Traços · d66','d66'),('Usar carga de item','charges'),('Iniciativa · d6','initiative'),('Moral e lealdade','morale'),('Salvaguarda','save'),('Ataque da ficha','attack'),('Enviar descrição ao chat','description'),('Aplicar dano ou cura','hp'),('Alternar fadiga','fatigue'),('Ajustar exaustão','exhaustion'),('Avançar turno · 10 minutos','turn'),('Avançar período · 6 horas','period')]:macro(name,tool)
for t in tables:macro('Sortear · '+t['name'],table=t['name'])
write('macros',macros)
catalog=read('catalog');catalog['counts']={s:len(read(s)) for s in ['bestiary','equipment','spells','abilities','magic-items','rolltables','references','macros']};write('catalog',catalog)
print(catalog)

"""Rebuild compendium JSON from the authorized Livro Base V2 PDF.
Requires PyMuPDF. Paths are relative to the workspace; PDF is not distributed.
"""
from pathlib import Path
import fitz,json,re,hashlib,html,collections
ROOT=Path(__file__).resolve().parents[1]
PDF=ROOT.parent/'project_sources/01-d20age-RPG-LB-V2-.pdf'
BOOK=fitz.open(PDF)
OUT=ROOT/'content';OUT.mkdir(exist_ok=True)
IMG='systems/d20age/assets/crest.svg'
def uid(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
def write(name,data): (OUT/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def source(page,**extra):return {'d20age':{'source':'d20age RPG - LB (V2)','page':page-5,'pdfPage':page,**extra}}
def item(name,kind,description,page,**system):return {'_id':uid(kind+name+str(page)),'name':name,'type':kind,'img':IMG,'system':{'description':description+f'\n\nLivro Base V2, p. {page-5}.',**system},'flags':source(page)}
def page_lines(q,n):
 cols=[[],[]]
 for b in q.get_text('dict')['blocks']:
  for l in b.get('lines',[]):
   spans=[s for s in l['spans'] if s['size']>=7];t=''.join(s['text'] for s in spans).strip()
   if not t or l['bbox'][1]>535:continue
   x,y=l['bbox'][:2];cols[int(x>=q.rect.width/2)].append({'text':t,'x':x,'y':y,'bold':all(s['flags']&16 for s in spans),'page':n})
 return sum([sorted(c,key=lambda l:(round(l['y'],1),l['x'])) for c in cols],[])
P={n:page_lines(q,n) for n,q in enumerate(BOOK,1)}
write('source-lines',P)
def full(n):return '\n'.join(l['text'] for l in P[n])
def clean(text):return re.sub(r'\s+',' ',text).strip()
def margin(l):return l['x']<40 or 225<l['x']<232
# Creatures: one Actor for every complete CA/DV/Atq stat block, including swarms and animated tree.
L=sum([P[n] for n in range(124,161)],[])
def heading(l):
 t=l['text'].lstrip('● ').strip()
 return margin(l) and (re.search(r'\((?:[A-Z]|colônia|colônia, M)\)$',t) is not None or t=='Árvore animada') and len(t)<75 and not re.match(r'(CA:|● Sentidos|● Imunidade)',l['text'])
H=[i for i,l in enumerate(L) if heading(l)]
creatures=[]; audit=[]; abilities=[]
for k,start in enumerate(H):
 end=H[k+1] if k+1<len(H) else len(L);chunk=L[start:end]
 stats=[j for j,l in enumerate(chunk) if l['text'].startswith('CA:')]
 if not stats:continue
 assert len(stats)==1,(L[start],stats)
 j=stats[0];stop=next((z for z in range(j+1,len(chunk)) if chunk[z]['text'].startswith('●') or chunk[z]['text'].startswith('NOTA')),len(chunk))
 raw=clean(' '.join(l['text'] for l in chunk[j:stop]))
 # XP without semicolon occurs only on the animated tree block.
 raw=re.sub(r'\s*:\s*',': ',raw)
 raw=re.sub(r'\bAt:', 'Atq:', raw)
 def field(key):
  m=re.search(r'\b'+key+r':\s*(.*?)(?=;\s*(?:CA|DV|Atq|TAC0|MV|SV|ML|Al|CG|Id|XP|NA|TT):|$)',raw)
  return m.group(1).strip(' ;') if m else ''
 vals={key:field(key) for key in ['CA','DV','Atq','TAC0','MV','SV','ML','Al','CG','Id','XP','NA','TT']}
 # Stats punctuation in a few original entries uses comma instead of semicolon.
 for key in ['CA','DV','Atq','TAC0','MV','SV','ML','Al','CG','Id','XP','NA','TT']:
  m=re.search(r'\b'+key+r':\s*(.*?)(?=\b(?:CA|DV|Atq|TAC0|MV|SV|ML|Al|CG|Id|XP|NA|TT):|$)',raw)
  if m:vals[key]=m.group(1).strip(' ,;')
 def num(key,default=0):
  m=re.match(r'-?\d+',vals[key]);return int(m.group()) if m else default
 pv=re.search(r'\((\d+)\s*PV\)',vals['DV'])
 headpv=re.search(r'\((\d+)\s*PV\s*/\s*cabeça\)',vals['DV'])
 hp=(int(headpv[1])*num('DV')) if headpv else int(pv.group(1)) if pv else {'Morcego comum':10,'Rato comum':8}.get(L[start]['text'].split(' (')[0],1)
 title=L[start]['text'].lstrip('● ').strip();name=title.split(' | ')[0]
 if name.isupper():name=name.capitalize()
 if '|' not in title:name=re.sub(r'\s*\(([A-Z])\)$',lambda m:' · '+{'D':'diminuto','P':'pequeno','M':'médio','G':'grande','E':'enorme','I':'imenso','L':'L (livro)'}.get(m[1],m[1]),name)
 if '| humano' in title:name='Veterano · '+name.lower()
 ancestor=next((a for a in reversed(H[:k+1]) if ' | ' in L[a]['text'] and L[a]['text'].split(' | ')[1].split()[0].isupper()),start)
 astop=H[H.index(ancestor)+1] if H.index(ancestor)+1<len(H) else end
 shared=L[ancestor:astop] if ancestor!=start and not any(l['text'].startswith('CA:') for l in L[ancestor:astop]) else []
 sharedtext=clean(' '.join(l['text'] for l in shared))
 if 149<=L[start]['page']<=149:
  prefix=P[149][:next(z for z,l in enumerate(P[149]) if l['text'].startswith('ENTE |'))]
  sharedtext=clean(' '.join(l['text'] for l in prefix))+' '+sharedtext
 text=clean(' '.join(l['text'] for l in chunk));desc=(sharedtext+'\n\n' if sharedtext else '')+text+f'\n\nLivro Base V2, p. {L[start]["page"]-5}.'
 embedded=[]
 for a in re.finditer(r'(?:(\d+)x\s*)?([^,;()]+?)\s*\(([^()]+)\)',vals['Atq']):
  label=clean(a[2]).strip(' +');d=re.search(r'\d*d\d+(?:\s*[+-]\s*\d+)?|^\d+(?=\s*(?:\+|$))',a[3])
  if not d:continue
  formula=re.sub(r'\s+','',d[0]);formula=re.sub(r'^d','1d',formula)
  attack=item((a[1]+'× ' if a[1] else '')+label,'weapon','Ataque do bloco original: '+vals['Atq']+'\n'+a[3]+'\nCada clique rola um ataque. Repita conforme a quantidade indicada.',L[start]['page'],damage=formula,strengthDamage=False,weight=0,equipped=True,properties=a[3])
  attack['_id']=uid(name+attack['name']+str(len(embedded)));embedded.append(attack)
 traittext=sharedtext+' '+clean(' '.join(l['text'] for l in chunk[stop:]))
 for z,m in enumerate(re.finditer(r'●\s*([^●]+)',traittext)):
  trait=m[1].strip();label=trait.split(':')[0][:90]
  ability=item(label,'ability',trait,L[start]['page']);ability['_id']=uid(name+str(z)+label);embedded.append(ability)
  abilities.append(item(name+' · '+label,'ability',trait,L[start]['page']))
 if not embedded or not any(i['type']=='weapon' for i in embedded):embedded.append(item('Ataque especial','ability','Ataque: '+vals['Atq']+'\nConsulte a descrição da criatura para resolver o efeito.',L[start]['page']))
 notes='\n'.join(f'{key}: {value}' for key,value in vals.items())
 if headpv:notes+='\nPV total inicial: 8 por cabeça. Atualize PV e número de ataques ao cortar ou regenerar cabeças.'
 if not pv and not headpv:notes+='\nPV de grupo: valor inicial de referência; ajuste pelo número de indivíduos descrito no livro.'
 if not re.match(r'-?\d',vals['CA']):notes+='\nCA não se aplica no livro. Resolva dano conforme a imunidade descrita.'
 if not re.match(r'\d',vals['TAC0']):notes+='\nTAC0 não se aplica: não role ataque comum para os efeitos automáticos desta criatura.'
 bonus=0
 m=re.search(r'(?:bônus de |Bônus de )\+(\d+) em SV-F',desc)
 if m:bonus=int(m[1])
 actor={'_id':uid('creature'+title),'name':name,'type':'creature','img':IMG,'system':{'title':title,'ancestry':L[ancestor]['text'],'hp':{'value':hp,'max':hp},'combat':{'ac':num('CA',9),'thac0':num('TAC0',19),'autoArmor':False,'autoProgression':False},'movement':{'base':num('MV'),'auto':False},'hitDice':vals['DV'].split(' (')[0],'morale':num('ML',7),'alignment':vals['Al'],'languages':vals['Id'],'xp':num('XP'),'biography':desc,'notes':notes,'saves':{s:{'target':num('SV',15),'bonus':bonus if s=='spell' else 0} for s in ['death','contact','paralysis','eruption','spell']}},'items':embedded,'prototypeToken':{'actorLink':False,'bar1':{'attribute':'hp'},'disposition':-1},'flags':source(L[start]['page'],rawStats=vals)}
 # Thousands separator in printed XP is numeric punctuation, not a decimal.
 actor['system']['xp']=int(re.match(r'[\d.]+',vals['XP'])[0].replace('.','')) if re.match(r'\d',vals['XP']) else 0
 creatures.append(actor);audit.append({'name':name,'pdfPage':L[start]['page'],'stats':vals})
assert len(creatures)==sum(l['text'].startswith('CA:') for l in L)==162
assert len({c['_id'] for c in creatures})==162
write('bestiary',creatures);write('source-audit',audit)
# All 60 spell descriptions, detected by the actual Duração field instead of table rows.
magic=sum([P[n] for n in range(40,50)],[]);spells=[];circle=1
for i,l in enumerate(magic):
 if l['text'].startswith('MAGIAS DE '):circle={'PRIMEIRO':1,'SEGUNDO':2,'TERCEIRO':3,'QUARTO':4,'QUINTO':5,'SEXTO':6}[l['text'].split()[2]]
 if l['text'].startswith('Duração:') and i>0:
  previous=magic[i-1]
  if not previous['bold']:continue
  name=previous['text'].strip();end=next((j-1 for j in range(i+1,len(magic)) if magic[j]['text'].startswith('Duração:')),len(magic))
  # Do not include the next circle's overview or table.
  end=min(end,next((j for j in range(i+1,len(magic)) if magic[j]['text'].startswith('MAGIAS DE ')),len(magic)))
  section=magic[i:end];text=clean(' '.join(x['text'] for x in section))
  get=lambda k:next((x['text'].split(':',1)[1].strip() for x in section if x['text'].startswith(k+':')),'')
  save=', '.join(dict.fromkeys(re.findall(r'SV-[MCPIF]',text)))
  spells.append(item(name,'spell',text,previous['page'],circle=circle,preparedCircle=circle,duration=get('Duração'),range=get('Alcance') or get('Alcace'),save=save))
write('spells',spells)
# Mundane equipment tables: individual encumbrance is not invented for backpack sundries.
equipment=[]
D52=full(52)
def equipment_description(name):
 base=name.split(' (')[0].split(',')[0]
 aliases={'Algema':'Algemas','Baú':'Baús','Rede':'Rede','Marreta':'Ferramentas (ex.: pá)','Pá':'Ferramentas (ex.: pá)','Picareta':'Ferramentas (ex.: pá)','Tochas':'Tocha','Velas':'Vela','Luvas de couro':'Luvas de couro'}
 base=aliases.get(base,base)
 match=re.search(r'(?m)^'+re.escape(base)+r':(.*?)(?=\n[^\n:]{1,35}:|$)',D52,re.S)
 return clean(match[0]) if match else 'Equipamento da lista do Livro Base V2.'
mis=[]
for col in [0,1]:
 a=[l for l in P[51] if int(l['x']>210)==col];start=next(i for i,l in enumerate(a) if l['text']=='Miscelânea')+2
 a=a[start:]
 for i,l in enumerate(a[:-1]):
  if not l['text'].isdigit() and re.fullmatch(r'\d+',a[i+1]['text']):mis.append((l['text'],int(a[i+1]['text'])))
for name,price in mis:
 weight=80 if name.startswith('Mochila') else 25 if name.startswith('Bolsa de cinto') else 0
 equipment.append(item(name,'equipment',equipment_description(name)+'\n\nMiscelânea: os objetos guardados são contabilizados na mochila (80 cn) ou bolsa de cinto (25 cn). Não some novamente sua massa.',51,price=price,weight=weight,properties='Miscelânea'))
a=P[52];start=next(i for i,l in enumerate(a) if l['text']=='cn')+1
for z in range(10):
 name,price,weight=[a[start+z*3+i]['text'] for i in range(3)]
 equipment.append(item(name,'equipment',equipment_description(name)+'\n\nUtensílio. Massa individual em cn.',52,price=int(price),weight=int(weight),properties='Utensílio'))
armor=[('Couro simples',8,10,100),('Couro fervido',7,20,200),('Lamelar',6,40,300),('Anelar',5,80,400),('Segmentada',4,100,500),('Couraça',3,200,600),('Escudo',9,10,100)]
for name,ac,price,weight in armor:equipment.append(item(name,'armor','Proteção: CA '+str(ac)+'. '+('O escudo melhora a CA em 1 ponto.' if name=='Escudo' else 'Consulte restrições de treinamento e carga.'),53,price=price,weight=weight,ac=ac,shield=name=='Escudo'))
weapons=[('Adaga',3,10,'1d4','Perfurante; arremesso 10’/20’/30’','thrown'),('Machadinha',1,20,'1d4','Cortante; arremesso 10’/20’/30’','thrown'),('Cajado',2,20,'1d4','Impacto; frágil','melee'),('Clava',1,30,'1d4','Impacto; frágil','melee'),('Besta',25,50,'1d6','Perfurante; alcance 50’/100’/150’; recarga: rodada completa','ranged'),('Funda',1,1,'1d4','Impacto; alcance 30’/60’/90’','ranged'),('Azagaia',2,20,'1d4','Perfurante; arremesso 20’/40’/60’','thrown'),('Espada curta',7,30,'1d6','Perfurante','melee'),('Maça',5,40,'1d6','Impacto','melee'),('Espada longa',10,50,'1d8','Perfurante; cortante','melee'),('Lança',5,50,'1d6','Perfurante','melee'),('Lança de cavalaria',10,100,'1d6','Perfurante; investida','melee'),('Machado de batalha',7,70,'1d8','Cortante','melee'),('Martelo de batalha',7,70,'1d8','Impacto','melee'),('Alabarda',20,100,'1d8','Cortante; duas mãos','melee'),('Martelo de guerra',15,150,'1d10','Impacto; duas mãos','melee'),('Machado de guerra',15,150,'1d10','Cortante; duas mãos','melee'),('Montante',30,100,'1d10','Perfurante; cortante; duas mãos','melee'),('Arco curto',25,25,'1d6','Perfurante; alcance 50’/100’/150’; duas mãos','ranged'),('Arco longo',50,50,'1d6','Perfurante; alcance 70’/140’/210’; duas mãos','ranged')]
for name,price,weight,damage,properties,mode in weapons:equipment.append(item(name,'weapon',properties+'\n\nArremessos: FOR positiva no dano apenas no primeiro intervalo. Projéteis: +1/+0/-1 no acerto por intervalo. Estas situações são arbitradas pela mesa.',54,price=price,weight=weight,damage=damage,properties=properties,mode=mode,range=properties.split('; alcance ')[-1] if '; alcance ' in properties else '5’',strengthDamage=mode=='melee'))
for name,price,weight in [('Aljava',2,20),('Munições (20)',5,0),('Alforge',10,0),('Sela',10,0)]:equipment.append(item(name,'equipment','Consulte a referência do livro. A massa de munições já está considerada na aljava.',54 if name in ['Aljava','Munições (20)'] else 55,price=price,weight=weight))
for name,price in [('Acônito',10),('Alecrim',.5),('Alho',.5),('Arruda',1),('Camomila',.1),('Dente-de-leão',.5),('Erva-cidreira',.5),('Gengibre',.1),('Sálvia',.1),('Valeriana',.5)]:equipment.append(item(name+' (dose)','equipment',full(55),55,price=price,properties='Erva medicinal'))
for name,price in [('Canoa',50),('Jangada',30),('Barco fluvial',4000),('Barco a vela',2000),('Galé a remos',30000),('Galé a vela',30000),('Galé de guerra',60000),('Nau',15000),('Charrete',100),('Carroça',400),('Carruagem',800)]:equipment.append(item(name,'equipment',full(56),56,price=price,carried=False,properties='Veículo; consultar capacidade, movimento e tripulação na descrição'))
for name,price,weight in [('Aríete',10000,0),('Balista',100,6000),('Munição (balista)',5,0),('Catapulta',100,10000),('Pedra (catapulta)',5,0),('Piche flamejante',25,0)]:equipment.append(item(name,'equipment',full(57),57,price=price,weight=weight,carried=False,properties='Máquina de guerra / munição'))
write('equipment',equipment)
# Class features and skills as drag-and-drop abilities.
for n in [26,27,28,29,31,32,33,34,35]:
 ls=P[n];group={26:'Arcanista',27:'Combatente',28:'Especialista',29:'Magista',31:'Anão',32:'Elfo',33:'Gnomo',34:'Perícia',35:'Perícia'}[n]
 heads=[i for i,l in enumerate(ls) if margin(l) and l['bold'] and len(l['text'])<65 and not re.match(r'(Tabela|NOTA|DESCRI|Aspectos gerais|Ancestralidade|Como arbitrar|Outras perícias|[A-Z\s]+$)',l['text']) and not l['text'].startswith('●')]
 for k,i in enumerate(heads):
  end=heads[k+1] if k+1<len(heads) else len(ls)
  end=min(end,next((j for j in range(i+1,len(ls)) if margin(ls[j]) and ls[j]['bold'] and (ls[j]['text'].startswith(('Tabela','NOTA','DESCRI')) or ls[j]['text'].isupper())),len(ls)))
  body=clean(' '.join(x['text'] for x in ls[i+1:end]))
  if len(body)<35:continue
  abilities.append(item(group+' · '+ls[i]['text'],'ability',body,n,properties=group))
write('abilities',list({a['_id']:a for a in abilities}.values()))
# Magic and special items: descriptions use bold margin headings, not row labels.
magicitems=[]
for first,last in [(166,168),(174,174),(179,185)]:
 ls=sum([P[n] for n in range(first,last+1)],[])
 heads=[i for i,l in enumerate(ls) if margin(l) and l['bold'] and not l['text'].startswith(('>','●','NOTA','DESCRI','Tabela','PARÂMETROS','Uso:','Cargas:','Dimensões:','Vínculo:')) and not l['text'].isupper() and not l['text'].endswith(':') and len(l['text'])>4]
 for k,i in enumerate(heads):
  end=heads[k+1] if k+1<len(heads) else len(ls);name=re.sub(r'^\d+\.\s*','',ls[i]['text']);price=re.search(r'\(([\d.]+) po',name)
  if price:name=name.split(' (')[0]
  body=clean(' '.join(x['text'] for x in ls[i+1:end]));body=re.split(r'\b(?:MISCELÂNEAS|ANÉIS|ARTEFATOS)\b',body)[0]
  if len(body)<25:continue
  magicitems.append(item(name,'equipment',body,ls[i]['page'],price=int(price[1].replace('.','')) if price else 0,properties='Item especial' if first==166 else 'Item mágico'))
# Usable numeric enchanted arms and armor, with printed modifier applied once.
for base in equipment:
 if base['type'] not in ['weapon','armor']:continue
 for bonus,cost in [(1,5000),(2,15000),(3,35000)]:
  b=json.loads(json.dumps(base));b['name']+=f' +{bonus}';b['_id']=uid(b['name']);b['system']['price']=cost;b['flags']=source(175 if b['type']=='armor' else 176)
  b['system']['description']+='\n\nEncantamento +'+str(bonus)+'. Consulte as propriedades especiais do livro.'
  if b['type']=='weapon':b['system'].update(attackBonus=bonus,damageBonus=bonus)
  else:b['system']['magicBonus']=bonus
  magicitems.append(b)
write('magic-items',magicitems)
# Every entry of the printed table index, preserved visually. Includes tables that cannot be rolled.
idx=P[11];indexed=[]
for i,l in enumerate(idx[:-1]):
 if l['text'] in ['INDICE DE TABELAS','TABELA','p.'] or l['text'].isdigit():continue
 nxt=idx[i+1]['text']
 if nxt.isdigit():indexed.append((l['text'],int(nxt)))
# One index row is vertically offset in the source PDF.
if not any(x[0]=='Mod de CA x tamanho' for x in indexed):indexed.append(('Mod de CA x tamanho',114))
journals=[]
renderpages=set()
for name,printed in indexed:
 pdf=printed+5;renderpages.add(pdf)
 journals.append({'_id':uid('reference'+name),'name':name,'flags':source(pdf),'pages':[{'_id':uid('image'+name),'name':f'{name} · LB V2 p. {printed}','type':'image','src':f'systems/d20age/assets/reference/page-{printed}.webp','image':{'caption':f'Livro Base V2, p. {printed}'}},{'_id':uid('text'+name),'name':'Texto para pesquisa','type':'text','text':{'format':1,'content':'<pre>'+html.escape(full(pdf))+'</pre>'}}]})
# Additional bestiary tables absent from the printed index.
for name,printed in [('Escama e baforada · draconato',134),('Escama e baforada · dragão',135),('Tesouros por tipo · covis',158),('Tesouros por tipo · individuais',159),('Magia oculta',24)]:
 pdf=printed+5;renderpages.add(pdf);journals.append({'_id':uid('reference'+name),'name':name,'flags':source(pdf),'pages':[{'_id':uid('image'+name),'name':name,'type':'image','src':f'systems/d20age/assets/reference/page-{printed}.webp'}]})
for journal in journals:
 if journal['name']=='Encontros aleatórios':
  for printed in [90]:
   renderpages.add(printed+5)
   journal['pages'].append({'_id':uid('encounter'+str(printed)),'name':f'Continuação · p. {printed}','type':'image','src':f'systems/d20age/assets/reference/page-{printed}.webp'})
for pdf in sorted(renderpages):
 target=ROOT/'assets/reference'/f'page-{pdf-5}.webp';target.parent.mkdir(exist_ok=True)
 pix=BOOK[pdf-1].get_pixmap(matrix=fitz.Matrix(2.2,2.2));from PIL import Image
 Image.frombytes('RGB',[pix.width,pix.height],pix.samples).save(target,'WEBP',quality=88)
write('references',journals)
write('catalog',{'version':'0.2.0','source':'d20age RPG - LB (V2)','counts':{k:len(v) for k,v in [('bestiary',creatures),('spells',spells),('equipment',equipment),('abilities',abilities),('magic-items',magicitems),('references',journals)]},'creatureStatsExpected':162,'indexedTables':len(indexed)})
print(json.loads((OUT/'catalog.json').read_text()))
print('SPELLS',[(s['name'],s['system']['circle']) for s in spells])
print('MAGIC ITEMS',[s['name'] for s in magicitems if '+' not in s['name']])

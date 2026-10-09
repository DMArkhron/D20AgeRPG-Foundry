from pathlib import Path
import json,re,hashlib,html
R=Path(__file__).resolve().parents[1]; P=json.load(open(R/'content/source-lines.json'))
def uid(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
tables=[]
def table(name,formula,rows,page,note=''):
 results=[]
 for i,(a,b,text) in enumerate(rows):results.append({'_id':uid(name+str(i)),'type':'text','description':html.escape(text),'range':[a,b],'weight':b-a+1,'drawn':False,'img':'systems/d20age/assets/crest.svg','flags':{'d20age':{'text':text}}})
 tables.append({'_id':uid('table'+name),'name':name,'img':'systems/d20age/assets/crest.svg','description':f'Livro Base V2, p. {page-5}. '+note,'formula':formula,'replacement':True,'displayRoll':True,'results':results,'flags':{'d20age':{'source':'d20age RPG - LB (V2)','page':page-5,'pdfPage':page}}})
def geo(name,page,x0,x1,y0,y1,formula,note='',rowx=None,expected=None):
 lines=[l for l in P[str(page)] if x0<=l['x']<x1 and y0<l['y']<y1]
 rx=rowx or (x0,x0+24)
 nums=[l for l in lines if rx[0]<=l['x']<rx[1] and re.fullmatch(r'\d{1,3}(?:\s*[-–]\s*\d{1,3}|\+)?',l['text'])]
 nums.sort(key=lambda l:l['y'])
 if expected is not None:assert len(nums)==expected,(name,len(nums),expected)
 rows=[]
 for i,l in enumerate(nums):
  bounds=( (nums[i-1]['y']+l['y'])/2 if i else y0,(l['y']+nums[i+1]['y'])/2 if i+1<len(nums) else min(y1,l['y']+14))
  body=[a for a in lines if bounds[0]<=a['y']<bounds[1] and a not in nums and a['x']>=rx[1]]
  body=sorted(body,key=lambda a:(round(a['y'],1),a['x']))
  text=re.sub(r'\s+',' ',' '.join(a['text'] for a in body)).strip()
  a=re.findall(r'\d+',l['text']);low=int(a[0]) or 100;high=int(a[-1]) or 100
  if l['text'].endswith('+'):high=int(re.search(r'd(\d+)',formula)[1])
  assert text,(name,l)
  rows.append((low,high,text))
 table(name,formula,rows,page,note)
 return rows
# Faithful dice, including 2d6 bell curves and d66 with independent dice.
for name,page,x0,x1,y0,y1,dice,count in [
 ('Marcas arcanas',38,34,410,205,500,'1d20',20),('Corrupções · primeiro círculo',39,35,410,257,530,'1d10',30),
 ('Marco seguro',81,35,208,230,307,'1d6',6),('Origem do item mágico',170,35,410,182,355,'1d10',10),
 ('Tipo de item mágico',170,227,410,55,159,'1d100',9),('Pergaminhos aleatórios',171,35,208,215,454,'1d100',None),
 ('Pergaminhos de magia',172,35,208,205,274,'1d100',6),('Miscelâneas mágicas',182,227,410,107,321,'1d20',20),
 ('Propósito especial do artefato',187,35,208,355,442,'1d6',6),('Poder especial do artefato',187,227,410,351,480,'1d100',11),
 ('Poder extraordinário do artefato',188,227,410,146,318,'1d100',15),('Traços e peculiaridades',191,35,208,179,534,'1d6*10+1d6',36),
 ('Marcas de aventura',193,227,410,58,420,'1d20',20),('Fortunas',196,35,208,211,508,'1d20',20),
 ('Tipo de armadura',175,227,410,107,149,'1d6',3),('Propriedades de arma',177,35,349,60,487,'1d20',14),
 ('Propriedades de armadura e escudo',175,35,349,300,487,'1d20',11),
 ]:
 try:
  rows=geo(name,page,x0,x1,y0,y1,dice,expected=count)
  if name.startswith('Corrupções'):
   base=tables.pop();allrows=rows
   for circle,formula in [(1,'1d10'),(2,'1d12'),(3,'1d20'),(4,'1d20+4'),(5,'1d20+10')]:table('Corrupções · círculo '+str(circle),formula,allrows,39,'Efeito permanente; aplicar apenas quando o mestre determinar uma corrupção.')
 except AssertionError as e:print('REVIEW',e)
for circle,size in enumerate([20,12,10,8,6,4],1):
 spells=[s for s in json.load(open(R/'content/spells.json')) if s['system']['circle']==circle]
 table('Magias · círculo '+str(circle),'1d'+str(size),[(i,i,s['name']) for i,s in enumerate(spells,1)],spells[0]['flags']['d20age']['pdfPage'])
table('Reação geral','2d6',[(2,2,'Enfurecida'),(3,5,'Hostil'),(6,8,'Incerta'),(9,11,'Cortês'),(12,12,'Amigável')],68,'Modificadores podem ultrapassar 2–12; extremos mantêm o resultado da primeira ou última faixa.')
table('Reação · contratação','2d6',[(2,2,'Entende como insulto real'),(3,5,'Nega o serviço'),(6,8,'Negocia um valor maior'),(9,11,'Aceita a oferta'),(12,12,'Aceita com entusiasmo (+1 na lealdade)')],58)
table('Mistura de poções','2d6',[(2,2,'Morte (SV-M para evitar)'),(3,3,'Efeitos anulados; incapacidade por 3 turnos'),(4,5,'Efeitos anulados'),(6,7,'Só a primeira poção funciona'),(8,9,'Só a segunda poção funciona'),(10,11,'Ambas funcionam'),(12,12,'Ambas funcionam com duração extra de 2d6 turnos')],173)
table('Olho tirano · tentáculos oculares','1d10',[(i,i,t) for i,t in enumerate(['Flecha mágica','Trevas (luz invertida)','Silêncio','Imobilizar pessoas','Encantar criaturas','Maldição','Lentidão (aceleração invertida)','Medo','Telecinesia','Raio da morte'],1)],159)
# Source d10 label contains 12 poisons; retain all entries using d12, explicitly documented.
for name,page,x0,x1,y0,y1,dice,note,expected in [
 ('Venenos',197,35,208,95,241,'1d12','O livro imprime d10, mas lista 12 resultados. Usa-se d12 para tornar todos acessíveis.',12),
 ('Gemas',165,35,208,53,116,'1d20','',5),('Joias · tamanho e valor',165,227,410,132,281,'1d10','',10),
 ('Poções mundanas',166,35,208,176,314,'1d10','',10),('Miscelâneas especiais',167,35,208,76,217,'1d12','O livro imprime d10, mas lista 12 resultados; d12 permite sortear todos.',12),
 ('Armas e proteções especiais',168,35,208,71,214,'1d12','',12),('Poções mágicas',173,227,410,180,530,'1d20','',20),
 ('Implementos mágicos',178,227,410,53,525,'1d100','',23),('Tipos de pedras iônicas',184,227,410,248,368,'1d8','O livro imprime d10, mas apresenta apenas 8 tipos. Usa-se d8, sem inventar resultados 9 e 10.',8),
 ]:
 try:geo(name,page,x0,x1,y0,y1,dice,note,expected=expected)
 except AssertionError as e:print('REVIEW',e)
# Ofícios: full-width tables with wrapped descriptions. Two separate d20 tables.
for name,y0,y1 in [('Ofícios comuns',61,223),('Ofícios profissionais',230,400)]:
 try:geo(name,59,35,410,y0,y1,'1d20',expected=20)
 except AssertionError as e:print('REVIEW',e)

# Two-column percentile generators must be joined, preserving original ranges.
for name,page,y0,y1 in [('Armaduras e escudos mágicos',175,156,279),('Armas mágicas',176,157,365),('Espadas mágicas',176,426,523)]:
 left=geo(name+' · parte A',page,35,204,y0,y1,'1d100',rowx=(35,61))
 tables.pop()
 right=geo(name+' · parte B',page,205,410,y0,y1,'1d100',rowx=(205,225))
 tables.pop()
 table(name,'1d100',sorted(left+right),page)

# Wilderness encounter types and every listed sub-table, preserving encounter numbers.
for page in [94,95]:
 for side,(x0,x1) in enumerate([(35,208),(227,410)]):
  lines=[l for l in P[str(page)] if x0<=l['x']<x1]
  dice=[l for l in lines if l['text']=='d8']
  for z,h in enumerate(dice):
   yend=dice[z+1]['y']-15 if z+1<len(dice) else 534
   label=next((l['text'] for l in reversed(lines[:lines.index(h)]) if l['text'].startswith(('Tabela','Sub-tabela','1A','1B','1C','1D','1E'))),'Montanha')
   geo('Encontros · '+label,page,x0,x1,h['y']+4,yend,'1d8')

(R/'content/rolltables.json').write_text(json.dumps(tables,ensure_ascii=False,indent=2)+'\n')
print('TABLES',len(tables))
for t in tables:print(t['name'],len(t['results']),t['results'][0]['description'],t['results'][-1]['description'])

"""Apply native folder metadata and original monochrome SVG icons to bundled content."""
from pathlib import Path
import json,hashlib,re,html,unicodedata,collections,shutil
R=Path(__file__).resolve().parents[1];C=R/'content';A=R/'assets/icons';A.mkdir(parents=True,exist_ok=True)
def id(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
def load(f):return json.loads((C/(f+'.json')).read_text())
def save(f,d): (C/(f+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
T={'BESTA':'Bestas','ANIMAL':'Bestas','CONSTRUTO':'Construtos','DESMORTO':'Desmortos','DRACÔNICO':'Dracônicos','EXTRAPLANAR':'Extraplanares','FEÉRICO':'Feéricos','FLORANÍDEO':'Floranídeos','GIGANTE':'Gigantes','GIGANTES':'Gigantes','HUMANOIDE':'Humanoides','MONSTRO':'Monstros'}
creatures=load('bestiary');types={a['name']:T[a['system']['ancestry'].split('|')[-1].strip().split()[0]] for a in creatures}
familycounts=collections.Counter(a['system']['ancestry'] for a in creatures)
# Each motif uses actual vector geometry. No bitmap data, filters, external fonts or scripts.
M={
 'sword':'<path d="M49 72 84 25 89 21 89 29 58 79ZM44 68 62 84M47 78 37 89M33 85 41 93"/>',
 'axe':'<path d="M43 95 73 30M66 36C41 21 39 52 54 59M69 34C94 26 103 47 83 63L64 52"/>',
 'bow':'<path d="M43 24Q94 59 43 98L58 62ZM33 64H98M88 55 98 64 87 73"/>',
 'staff':'<path d="M58 97 64 44M64 44C41 26 70 8 81 29Q85 40 64 44ZM49 63 73 66M57 82 69 83"/>',
 'shield':'<path d="M64 22 95 34 91 67Q83 89 64 101 44 88 36 66L32 34ZM64 32V86M43 55H85"/>',
 'armor':'<path d="M49 25Q64 40 79 25L93 40 87 61 80 53 84 96H44L48 53 40 61 34 40ZM47 68H81M64 40V92"/>',
 'pack':'<rect x="35" y="39" width="60" height="61" rx="12"/><path d="M45 40V32Q65 15 85 32V40M38 59H92M47 53V69M80 53V69M47 77H81V94H47Z"/>',
 'potion':'<path d="M54 22H74V48Q100 64 87 92Q65 107 42 91 28 65 54 48ZM48 76Q64 69 81 77M50 30H78"/><circle cx="62" cy="85" r="3"/>',
 'ring':'<ellipse cx="64" cy="71" rx="28" ry="27"/><ellipse cx="64" cy="71" rx="19" ry="19"/><path d="M51 31 64 20 78 31 64 49ZM51 31H78M58 26 64 49 70 26"/>',
 'scroll':'<path d="M39 29H86Q106 32 90 47H84V90H40Q24 107 27 86V40Q22 24 39 29ZM37 39H82M46 51H74M45 63H78M45 75H70M41 89H82"/>',
 'book':'<path d="M63 35Q40 23 26 31V92Q47 82 64 97 82 83 103 92V31Q82 23 63 35ZM64 35V95M36 45 55 48M36 57 55 60M74 48 94 45M74 60 94 57"/>',
 'fire':'<path d="M65 20Q85 41 76 56 91 44 91 67 108 89 78 102H50Q23 94 37 69 43 57 41 47 58 59 65 20ZM64 66Q48 82 58 95 75 96 64 66Z"/>',
 'ice':'<path d="M64 23V101M30 43 97 81M30 81 97 43M51 31 64 43 77 31M51 93 64 81 77 93M34 56 49 55 43 39M86 39 80 55 95 56M34 69 49 70 43 87M86 87 80 70 95 69"/>',
 'light':'<circle cx="64" cy="62" r="23"/><path d="M64 17V30M64 95V108M19 62H31M97 62H110M32 29 42 39M86 84 96 94M31 95 41 85M87 39 97 29"/>',
 'eye':'<path d="M23 65Q62 16 105 65 65 108 23 65Z"/><circle cx="64" cy="64" r="18"/><circle cx="64" cy="64" r="5"/>',
 'leaf':'<path d="M34 92Q20 33 97 26 106 91 34 92ZM26 104 85 40M43 82 42 55M59 67 58 42M52 74 81 74"/>',
 'star':'<path d="M64 20 73 50 105 60 74 72 64 105 54 73 23 62 54 51ZM33 30 40 37M89 91 98 99"/>',
 'ghost':'<path d="M32 96V55Q32 23 64 23 96 23 96 55V96L80 85 64 98 49 85ZM52 51V59M76 51V59M52 73Q63 66 77 73"/>',
 'dragon':'<path d="M35 94Q15 83 36 66L42 42 31 26 56 37 79 33 97 48 86 62 67 57 60 69 87 92 66 103ZM42 44 48 48M52 83 52 40 25 50M67 76 94 71 104 91 87 84M76 45H80"/>',
 'wolf':'<path d="M29 41 29 22 49 39 78 39 98 22 98 44 93 75 65 103 36 75ZM41 56 54 61M77 61 89 56M53 79 65 88 77 79M65 88V97"/>',
 'bird':'<path d="M27 96Q39 63 59 57 54 28 78 32L84 45 102 51 82 57Q76 91 43 98ZM39 88 29 56 59 70M55 96 50 108M71 93 75 107"/><circle cx="75" cy="44" r="2"/>',
 'bug':'<ellipse cx="64" cy="69" rx="21" ry="30"/><path d="M64 40V97M49 41 36 26M80 41 94 26M43 57 27 43M43 72H25M45 86 28 99M85 57 100 43M86 72H104M82 86 100 99"/>',
 'snake':'<path d="M35 89Q13 70 36 58 58 46 74 62 97 78 92 49L85 37Q71 20 56 30 47 45 65 47L79 43M37 89Q62 110 84 94M86 35 101 25M96 30 107 33M63 36H64"/>',
 'fish':'<path d="M31 62Q67 23 94 61 64 96 31 62ZM31 62 18 39V86ZM58 39 66 23 77 38M54 81 68 95 73 81"/><circle cx="81" cy="59" r="3"/>',
 'golem':'<path d="M49 23H80L85 44 77 55H49L42 43ZM46 57H81L92 95H34ZM44 63 26 85 34 98M82 63 102 85 95 98M50 95V108M78 95V108M51 37H57M70 37H77M58 48H70"/>',
 'faerie':'<path d="M62 58Q28 13 24 45 23 70 52 68 18 82 39 95L60 78M67 58Q101 13 105 45 106 70 77 68 110 82 89 95L69 78M64 54V97M53 108 64 94 76 108"/><circle cx="64" cy="43" r="8"/>',
 'giant':'<path d="M50 23H78V49H50ZM44 51H85L95 82 82 87 78 71V105H65V80H58V105H44V72L35 87 24 79ZM45 59 30 55M83 56 108 45 114 60 91 71"/>',
 'helmet':'<path d="M29 93V57Q30 24 64 24 100 23 100 57V93H76V68H52V93ZM32 54H96M64 28V55M37 66H50M77 66H91"/>',
 'claw':'<path d="M28 92Q26 51 43 27L41 71M48 99Q49 43 69 22L63 80M72 100Q81 60 103 39L92 92M27 93Q57 112 92 92"/>',
 'wand':'<path d="M31 103 84 48M78 46 86 55M91 21 95 32 106 36 95 40 91 51 87 40 76 36 87 32ZM44 33V45M38 39H51"/>',
 'boot':'<path d="M52 23H81L76 78 98 88V101H32V88L49 76ZM50 48H78M47 61H78M36 89H92"/>',
 'key':'<circle cx="48" cy="42" r="20"/><circle cx="48" cy="42" r="9"/><path d="M58 58 93 95 104 85 98 79 88 85 81 76 86 69"/>',
 'torch':'<path d="M58 100 53 59H77L70 100ZM49 59H81M57 53Q31 40 57 23 56 35 68 29 92 52 71 53M61 70H72M62 82H71"/>',
 'boat':'<path d="M23 83H105L87 102H41ZM62 81V23L95 73H65M55 36 29 70H56M25 110Q39 105 49 110 66 116 79 110 98 104 109 110"/>',
 'coin':'<circle cx="64" cy="62" r="35"/><circle cx="64" cy="62" r="27"/><path d="M69 43Q42 38 49 56L76 66Q85 86 54 84M64 35V90"/>',
 'die':'<path d="M33 31H94V94H33ZM26 25 101 28 99 101 28 98"/><circle cx="46" cy="46" r="3"/><circle cx="79" cy="46" r="3"/><circle cx="64" cy="64" r="3"/><circle cx="46" cy="80" r="3"/><circle cx="79" cy="80" r="3"/>'
}
def motif(doc,category=''):
 n=norm(doc['name']);kind=doc.get('type')
 for words,key in [('adaga espada montante alabarda','sword'),('machado machadinha','axe'),('arco besta funda','bow'),('varinha','wand'),('cajado','staff'),('escudo','shield'),('couro couraca armadura lamelar anelar segmentada','armor'),('pocao pomada veneno oleo cha ','potion'),('anel','ring'),('pergaminho papiro','scroll'),('grimorio livro','book'),('bota','boot'),('chave gazua algema','key'),('tocha vela lampiao','torch'),('barco gale canoa nau jangada carroca carruagem charrete','boat')]:
  if any(w in n for w in words.split()):return key
 if kind=='creature':
  for words,key in [('abelha besouro aranha formiga cupim escorpiao centopeia caranguejo','bug'),('cobra vibora naja cascavel piton serpe','snake'),('gralha aguia grifo coruja pegaso','bird'),('tubarao polvo sereia tritao crocodilo','fish')]:
   if any(w in n for w in words.split()):return key
  return {'Bestas':'wolf','Construtos':'golem','Desmortos':'ghost','Dracônicos':'dragon','Extraplanares':'star','Feéricos':'faerie','Floranídeos':'leaf','Gigantes':'giant','Humanoides':'helmet','Monstros':'claw'}.get(category,'claw')
 if kind=='spell':
  for words,key in [('fogo flamej','fire'),('restaur ressur criar comida','leaf'),('luz','light'),('olho detectar clariv leitura pes ultravisao','eye'),('morte mortos medo maldicao','ghost'),('tranca aferrolhar','key'),('resistencia','shield'),('teia emaranhar','leaf')]:
   if any(w in n for w in words.split()):return key
  return 'star'
 return 'book' if kind=='ability' else 'die' if 'results' in doc else 'scroll' if 'pages' in doc else 'pack'
def icon(doc,category=''):
 key=motif(doc,category);name=doc['name'];code=id(doc['_id']+name);filename=code+'.svg'
 hatch=''.join(f'<path d="M{x} 110l8-8"/>' for x in range(25,98,8))
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-labelledby="t"><title id="t">{html.escape(name)}</title><rect width="128" height="128" rx="9" fill="#f7f4eb"/><g fill="none" stroke="#191919" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20 14 12 108 10 117 18 117 110 110 117 17 117 10 108Z"/><g stroke-width="1" opacity=".45">{hatch}<path d="M16 24V99M112 27V102"/></g>{M[key]}</g><path d="M19 17h6m-3-3v6M104 108h6m-3-3v6" stroke="#333" fill="none"/></svg>'''
 (A/filename).write_text(svg);doc['img']='systems/d20age/assets/icons/'+filename
 doc.setdefault('flags',{}).setdefault('d20age',{}).update(iconMotif=key,visualVersion='0.2.1')
 return filename
folders={};generated=set()
def folder(file,path,kind):
 existing=folders.setdefault(file,[]);parent=None
 for depth,name in enumerate(path):
  key='/'.join(path[:depth+1]);fid=id(file+'/'+key)
  if not any(f['_id']==fid for f in existing):existing.append({'_id':fid,'name':name,'type':kind,'folder':parent,'color':'#373737','sorting':'a','flags':{'d20age':{'path':key}}})
  parent=fid
 return parent
files={'bestiary':'Actor','equipment':'Item','spells':'Item','abilities':'Item','magic-items':'Item','rolltables':'RollTable','references':'JournalEntry','macros':'Macro'}
classes=['Arcanista','Combatente','Especialista','Magista','Anão','Elfo','Gnomo']
def equipmentpath(d):
 n=norm(d['name']);t=d['type']
 if t=='weapon':return ['Armas',{'melee':'Corpo a corpo','ranged':'Projéteis','thrown':'Arremesso'}.get(d['system'].get('mode'),'Corpo a corpo')]
 if t=='armor':return ['Proteções','Escudos' if d['system'].get('shield') else 'Armaduras']
 if n.startswith('veneno'):return ['Consumíveis','Venenos']
 if 'medicinal' in norm(d['system'].get('properties','')):return ['Consumíveis','Ervas medicinais']
 if d['system'].get('carried') is False:return ['Transporte e cerco','Máquinas de guerra' if 'Máquina' in d['system'].get('properties','') else 'Veículos']
 return ['Equipamentos','Utensílios' if d['system'].get('properties')=='Utensílio' else 'Miscelâneas']
for file,kind in files.items():
 docs=load(file)
 for d in docs:
  n=norm(d['name']);category=''
  if file=='bestiary':
   category=types[d['name']];path=[category]
   if familycounts[d['system']['ancestry']]>1:path.append(d['system']['ancestry'].split('|')[0].strip().capitalize())
   for child in d['items']:generated.add(icon(child))
  elif file=='equipment':path=equipmentpath(d)
  elif file=='spells':path=['Magias',str(d['system']['circle'])+'º círculo']
  elif file=='abilities':
   prefix=d['name'].split(' · ')[0]
   path=['Personagens',prefix] if prefix in classes or prefix in ['Perícia','Fortuna'] else ['Criaturas',types.get(prefix,'Poderes especiais')]
  elif file=='magic-items':
   if d['type'] in ['weapon','armor']:path=['Equipamento encantado','Armas' if d['type']=='weapon' else 'Proteções']
   else:path=['Itens especiais' if d['flags']['d20age'].get('page',200)<164 else 'Itens mágicos', 'Varinhas' if n.startswith('varinha') else 'Cajados e orbes' if n.startswith(('cajado','orbe')) else 'Anéis' if n.startswith('anel') else 'Poções e preparos' if n.startswith(('pocao','oleo','pomada','cha','agua','vapor','biotonico','elixir','suco','super ')) else 'Miscelâneas']
  elif file in ['rolltables','references']:
   page=d['flags']['d20age']['page'];path=['Regras e personagens' if page<57 else 'Aventura e exploração' if page<113 else 'Criaturas' if page<157 else 'Tesouros e magia' if page<185 else 'Apêndices']
  else:
   path=['Sorteios', 'Encontros' if 'encontros' in n else 'Magias' if 'magias' in n or 'corrupcoes' in n else 'Geradores'] if d['flags']['d20age'].get('table') else ['Ferramentas','Mestre' if d['flags']['d20age']['tool'] in ['install','turn','period'] else 'Ficha e mesa']
  d['folder']=folder(file,path,kind);d['flags']['d20age']['folderPath']=path;generated.add(icon(d,category))
  if file=='bestiary':d.setdefault('prototypeToken',{}).setdefault('texture',{})['src']=d['img']
 save(file,docs)
save('folders',folders)
catalog=load('catalog');catalog.update(version='0.2.1',icons=len(generated),folders=sum(map(len,folders.values())));save('catalog',catalog)
# Index for convenient vector-art review; not required by Foundry.
rows=[]
for f in ['bestiary','equipment','spells','magic-items']:
 for d in load(f):rows.append({'name':d['name'],'img':d['img'],'category':f})
save('icon-index',rows)
print(catalog)

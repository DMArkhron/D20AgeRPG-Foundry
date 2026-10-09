"""Source-bounded LB V2 descriptions; never regenerate document statistics or IDs.

Run after the original content builders. source-lines.json is the authorized
book extraction (PDF pages, printed page = PDF - 5). The audit covers every
document, including embedded creature records; the migration records retired
misattributed traits. Repeated runs produce identical descriptions.
"""
from pathlib import Path
import argparse, copy, hashlib, html, json, re

R = Path(__file__).resolve().parents[1]
C = R / 'content'
REVISION = '0.4.7'
KINDS = ['equipment', 'spells', 'magic-items', 'abilities', 'bestiary', 'rolltables', 'references', 'macros']
def read(name): return json.loads((C / (name + '.json')).read_text())
def write(name, data): (C / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
def uid(text): return hashlib.sha256(text.encode()).hexdigest()[:16]
P = {int(k): v for k, v in read('source-lines').items()}
D = {k: read(k) for k in KINDS}
parser=argparse.ArgumentParser();parser.add_argument('--baseline',type=Path)
args=parser.parse_args()
before = json.loads(args.baseline.read_text()) if args.baseline else copy.deepcopy(D)
prior = read('description-migration') if (C / 'description-migration.json').exists() else {'retired': {}, 'oldHashes': {}}
retired = {} if args.baseline else prior['retired']
old_hashes = {} if args.baseline else prior['oldHashes']
old_descriptions = {} if args.baseline else prior.get('oldDescriptions',{})
audit = []
def clean(text):
    text = text.replace('\u00ad', '').replace('\u00a0', ' ')
    text = re.sub(r'(?<=\w)-\s+(?=se\b)', '-', text)
    return re.sub(r'\s+', ' ', text).strip()
def source(n): return f'Livro Base V2, p. {n - 5}.'
def body(text): return re.sub(r'\s*Livro Base V2, p\. \d+\.\s*', '\n\n', text).strip()
def paragraphs(text):
    parts = re.split(r'\n\s*\n', text)
    out = []
    for part in parts:
        part = clean(part)
        part = re.sub(r'\s*(?=●|>>|▫)', '\n\n', part)
        part = re.sub(r'\s+(?=NOTA(?:S)?(?: DE ARBITRAG(?:EM|REM))?\b)', '\n\n', part)
        out.extend(p.strip() for p in part.split('\n\n') if p.strip())
    return '\n\n'.join(out)
def description(text, n): return paragraphs(text) + '\n\n' + source(n)
def lines(n, start, end): return clean(' '.join(l['text'] for l in P[n][start:end]))
def colon_sections(n, start, end):
    a = P[n][start:end]
    starts = [i for i,l in enumerate(a) if re.match(r'^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^:]{0,40}:',l['text'])]
    # The tool example contains an internal colon; still one heading.
    result = {}
    for k,i in enumerate(starts):
        stop = starts[k+1] if k+1 < len(starts) else len(a)
        key = a[i]['text'].split(':',1)[0]
        text = clean(' '.join(l['text'] for l in a[i:stop]))
        result[key] = text
    return result

# Table results have their own boundaries too. Repair wrapped price/name cells
# without changing dice, ranges, weights, or table/result IDs.
priced={'Pergaminhos de magia','Venenos','Gemas','Joias · tamanho e valor','Poções mundanas','Miscelâneas especiais','Poções mágicas','Implementos mágicos'}
terrains={'Encontros · Tabela 1 - Montanha e planície':('Montanha','Planície'),
 'Encontros · Tabela 2 - Floresta e deserto':('Floresta','Deserto'),
 'Encontros · Tabela 3 - Rio / lago e pântano':('Rio / lago','Pântano')}
for table in D['rolltables']:
    for row in table['results']:
        text=row['flags']['d20age']['text']
        if table['name'] in priced:
            # A previously corrected result already has its explicit unit.
            if not text.endswith(' po'):
                prices=[m for m in re.finditer(r'(?<![\w+])\d+(?:\.\d{3})*(?![\wº])',text) if '(' not in text[:m.start()].rsplit(')',1)[-1]]
                assert prices,(table['name'],text)
                m=prices[-1];price=m.group();name=clean(text[:m.start()]+' '+text[m.end():])
                text=name+' · '+price+' po'
        if table['name'] in terrains and ': ' not in text:
            left,right=terrains[table['name']];words=text.split();assert len(words)==2,text
            text=f'{left}: {words[0]}; {right}: {words[1]}.'
        text=text.replace('Consome metade de Branca água e comida','Branca: consome metade de água e comida')
        text=text.replace('Enxame se insetos','Enxame de insetos').replace('Vapor do guaco','Vapor de guaco')
        row['flags']['d20age']['text']=text;row['description']=html.escape(text)

# Equipment: source paragraphs and table cells are bounded independently.
misc = colon_sections(52,36,99)
aliases = {'Algema':'Algemas (par)', 'Baú':'Baús', 'Carvão':'Carvão (saco)', 'Óleo':'Óleo (frasco)',
           'Marreta':'Ferramentas (ex.', 'Pá':'Ferramentas (ex.', 'Picareta':'Ferramentas (ex.',
           'Tochas':'Tocha', 'Velas':'Vela', 'Tinta':'Tinta'}
herbs = {
 'Acônito':'Repele lobos e licantropos.', 'Alecrim':'Estimulante mental; alívio de dores.',
 'Alho':'Trata infecções e repele vampiros.', 'Arruda':'Afasta maldições.',
 'Camomila':'Calmante; tratamento de insônia e indigestão.',
 'Dente-de-leão':'Desintoxicações alimentares.',
 'Erva-cidreira':'Tratamento de ansiedade, insônia e problemas digestivos.',
 'Gengibre':'Alívio de náuseas e dores musculares.',
 'Sálvia':'Tratamento de espasmos; melhora a concentração e trata indigestão.',
 'Valeriana':'Tratamento de insônia; relaxante muscular.'}
vehicle_rows = {
 'Canoa':(6000,'1 pessoa (remo)',60,9,15,49,51), 'Jangada':(5000,'1 pessoa (remo)',30,9,5,51,57),
 'Barco fluvial':(30000,'8 pessoas (remos)',60,8,30,57,61), 'Barco a vela':(20000,'1 pessoa (vela)',120,8,30,61,63),
 'Galé a remos':(300000,'180 pessoas (remos)',90,7,110,63,65), 'Galé a vela':(300000,'20 pessoas (velas)',120,7,110,65,67),
 'Galé de guerra':(300000,'30 pessoas (velas)',60,7,150,67,71), 'Nau':(400000,'75 pessoas (velas)',150,8,60,71,74),
 'Charrete':(6000,'1 mula',20,9,5,115,118), 'Carroça':(8000,'1 cavalo',20,9,15,118,119),
 'Carruagem':(25000,'2 cavalos',20,8,20,119,122)}
war_spans={'Aríete':(26,32),'Balista':(32,42),'Catapulta':(42,57),'Pedra (catapulta)':(55,57),'Piche flamejante':(57,64)}
for d in D['equipment']:
    s = d['system']; name = d['name']; n = d['flags']['d20age']['pdfPage']
    if n in (51,52):
        base = name.split(' (')[0].split(',')[0]; key = aliases.get(base,base)
        text = misc.get(key)
        if text:
            # Label is supplied by the document title, not duplicated in prose.
            text = re.sub(r'^'+re.escape(key)+r'[^:]*:\s*','',text) if not key.startswith('Ferramentas') else 'Ferramenta de usos diversos.'
        else: text = f'{name}. Registro da tabela de '+('miscelâneas' if n==51 else 'utensílios')+' do Livro Base.'
        if base == 'Ração': text = 'Alimento para viagens. '+('A ração simples é perecível (por exemplo, pão) e dura uma semana.' if 'simples' in name else 'A ração especial é desidratada e duradoura.')
        if n == 51: text += '\n\nMiscelânea: a massa dos objetos guardados é contabilizada na mochila (80 cn) ou bolsa de cinto (25 cn); não some novamente a massa desses objetos.'
        else: text += '\n\nUtensílio: contabilize sua massa individual em cn.'
    elif s.get('properties') == 'Erva medicinal':
        text = herbs[name.replace(' (dose)','')]
    elif name in vehicle_rows:
        cap, traction, move, ac, hp, start, end = vehicle_rows[name]
        text = lines(56,start,end).replace('NOTA ', '\n\n')
        text += f'\n\nCapacidade de carga: {cap:,} cn. Tração: {traction}. Movimento: {move}’. CA: {ac} [{19-ac}]. PV: {hp}.'.replace(',','.')
    elif name in war_spans:
        start,end=war_spans[name]; text=lines(57,start,end)
        # Loading options belong to the catapult; pitch effects to its ammunition.
    elif name == 'Munição (balista)':
        text='Seta para balista. O disparo pela máquina causa 3d6 de dano, com alcance de 200’/400’/600’.'
    elif d['type'] == 'armor':
        if name=='Escudo': text='O escudo melhora a CA em 1 ponto. Equipá-lo exige uma ação. Pode ser usado intencionalmente como cobertura.'
        else:
            group='leve' if name in ['Couro simples','Couro fervido'] else 'média' if name in ['Lamelar','Anelar'] else 'pesada'
            equip='seis rodadas' if group=='leve' else 'um turno'+(' (o dobro sem auxílio)' if group=='pesada' else '')
            text=f'Armadura {group}. CA: {s["ac"]} [{19-s["ac"]}]. Equipar exige {equip}. Combater sem treinamento causa exaustão.'
            if group!='leve': text+='\n\nElmo, braçadeiras, botas e acessórios estão incluídos. Remover parte da armadura reduz a carga e piora a CA em 1 ponto para cada 100 cn removidos.'
    elif d['type']=='weapon':
        text=f'Dano: {s["damage"]}. {s["properties"]}.'
        if s['mode']=='thrown': text+='\n\nArremesso: o modificador positivo de FOR é adicionado ao dano apenas no primeiro intervalo.'
        elif s['mode']=='ranged': text+='\n\nProjétil: modificadores de +1, +0 e −1 no acerto nos três intervalos, respectivamente.'
        else: text+='\n\nAlcance comum: 5’. Sacar a arma exige movimento.'
        if name=='Besta': text+='\n\nA recarga exige uma rodada completa (ação e movimento). Uma besta já carregada é ágil e geralmente ganha a iniciativa. Exige duas mãos.'
        elif name.startswith('Arco '): text+='\n\nA recarga exige movimento. Exige duas mãos.'
        elif name=='Lança de cavalaria': text+='\n\nInvestida com montaria: deslocar ao menos 60’ causa o dobro de dano.'
    elif name=='Aljava': text='Estojo ou bolsa que armazena até 20 munições. Sua massa é 20 cn, já considerando as munições.'
    elif name=='Munições (20)': text='Conjunto de 20 setas, flechas ou pedras. Sua massa já é considerada na aljava.'
    elif name=='Alforge': text='Alforge listado entre os adicionais para animais. Preço: 10 po.'
    elif name=='Sela': text='Sela listada entre os adicionais para animais. Preço: 10 po.'
    else: text=body(s['description']) # individually sourced venom rows
    s['description']=description(text,n)

# Spells: actual duration/range lines delimit each record, not circle lists.
for d in D['spells']:
    text=body(d['system']['description'])
    text=re.sub(r'\s+(?=Alca(?:nce|ce):)', '\n\n', text)
    # Separate metadata from the effect at the last source range line.
    n=d['flags']['d20age']['pdfPage']; spell_lines=sum([P[x] for x in range(n,min(n+2,50))],[])
    i=next(i for i,l in enumerate(spell_lines) if l['text']==d['name'] and i+1<len(spell_lines) and spell_lines[i+1]['text'].startswith('Duração:'))
    j=i+1
    while j<len(spell_lines) and spell_lines[j]['text'].startswith(('Duração:','Alcance:','Alcace:')): j+=1
    metadata=clean(' '.join(l['text'] for l in spell_lines[i+1:j])).replace('Alcace:','Alcance:')
    compact=clean(text)
    assert compact.startswith(metadata),d['name']
    effect=compact[len(metadata):].strip()
    effect=re.sub(r'^(Alvo: .*?)(?= [A-ZÁÉÍÓÚ])',r'\1\n\n',effect,count=1)
    d['system']['description']=description('\n\n'.join(l['text'].replace('Alcace:','Alcance:') for l in spell_lines[i+1:j])+'\n\n'+effect,n)

# Class features and the ten skills. Stop at the next true heading or table.
cuts={'Arcanista · Falha arcana':'Magias / dia por círculo', 'Combatente · Evolução':'Tabela -',
 'Combatente · Trespassar':'Especialização P I F', 'Especialista · Perícia':'Tabela -',
 'Especialista · Aprendendo novas perícias':'Perícias P I F','Magista · Falha arcana':'Tabela -',
 'Elfo · Novas magias':'Ancestralidade','Gnomo · Camuflagem':'Ancestralidade'}
skills=['Acurácia','Arcanismo','Arma','Decifrar','Escalar','Esconder','Furtividade','Idioma','Punga','Sobressaltar']
skill_text={}
for k,name in enumerate(skills):
    start=next(i for i,l in enumerate(P[34]) if l['text']==name)+1
    end=next(i for i,l in enumerate(P[34]) if l['text']==skills[k+1]) if k+1<len(skills) else 51
    skill_text[name]=lines(34,start,end)
noncreature=list({d['_id']:d for d in D['abilities'] if d['system'].get('properties')}.values())
for d in noncreature:
    name=d['name']; n=d['flags']['d20age']['pdfPage']; text=body(d['system']['description'])
    if name in cuts: text=text.split(cuts[name])[0].strip()
    if name.startswith('Perícia · '): text=skill_text[name.split(' · ')[1]]
    if name=='Arcanista · Nível':
        # Preserve its ID; the accidental heading was a class progression reference.
        text='Progressão de arcanista: níveis 1 a 10; DV acumulados de 1d4 a 10d4. Consulte a tabela “Arcanista” no compêndio de consultas para XP, TAC0, salvaguardas e magias por círculo.'
    if name=='Arcanista · Magia':
        text=text.replace(' Memorização ', '\n\nMemorização: ').replace(' Conjuração ', '\n\nConjuração: ')
    d['system']['description']=description(text,n)
for name in ['Esconder','Idioma']:
    if not any(d['name']=='Perícia · '+name for d in noncreature):
        d=copy.deepcopy(next(d for d in noncreature if d['name']=='Perícia · Escalar'))
        d['_id']=uid('abilityPerícia · '+name+'34');d['name']='Perícia · '+name
        d['system']['description']=description(skill_text[name],34);noncreature.append(d)

# Bestiary: bound the block by both species headings AND category headings.
L=sum([P[n] for n in range(124,161)],[])
def heading(l):
    t=l['text'].lstrip('● ').strip(); margin=l['x']<40 or 225<l['x']<232
    return margin and (re.search(r'\((?:[A-Z]|colônia|colônia, M)\)$',t) or t=='Árvore animada') and len(t)<75 and not re.match(r'(CA:|● Sentidos|● Imunidade)',l['text'])
H=[i for i,l in enumerate(L) if heading(l)]
major_names={'BESTAS','CONSTRUTOS','DESMORTOS','DRACONICOS','EXTRAPLANARES','FEERICOS','FEÉRICOS','FLORANIDEOS','GIGANTES','HUMANOIDES','MONSTROS'}
M=[i for i,l in enumerate(L) if l['text'] in major_names]
def bound(i): return min([j for j in H+M if j>i]+[len(L)])
def joined(a): return clean(' '.join(l['text'] for l in a))
def traits(text):
    return [m.group(1).strip() for m in re.finditer(r'●\s*([^●]+)',text)]
creature_abilities=[]
for d in D['bestiary']:
    title=d['system']['title'];n=d['flags']['d20age']['pdfPage']
    i=next(i for i in H if L[i]['text'].lstrip('● ').strip()==title)
    own=L[i:bound(i)]
    ancestry=d['system']['ancestry']
    a=next((j for j in reversed(H) if j<=i and L[j]['text']==ancestry),i)
    family=L[a:bound(a)] if a!=i and not any(l['text'].startswith('CA:') for l in L[a:bound(a)]) else []
    m=max([j for j in M if j<=i]+[-1])
    common=L[m+1:bound(m)] if m>=0 else []
    # Floranids previously inherited common text through a PDF-page special case;
    # now every applicable category is handled using its actual boundary.
    if d['name'].startswith('Veterano · '):
        family=[l for l in family if l['page']==154]
        family=family[:next((j for j,l in enumerate(family) if l['text'].startswith('● ESTATÍSTICAS')),len(family))]
    combined='\n\n'.join(t for t in [joined(common),joined(family),joined(own)] if t)
    if d['name'].startswith('Dragão '):
        color=d['name'].split(' · ')[0].split(' ',1)[1]
        breath={'azul':('raio','linha de 5’ × 100’','C'),'branco':('gelo','cone de 80’','I'),
                'negro':('ácido','linha de 5’ × 60’','C'),'verde':('veneno','raio de 30’','M'),
                'vermelho':('fogo','cone de 90’','I'),'dourado':('fogo','cone de 90’','I')}[color]
        replacement=f'● Baforada (3x / dia): {breath[0]}, {breath[1]}. Tudo na área sofre dano igual ao PV atual do dragão. SV-{breath[2]} reduz o dano à metade. '
        combined=re.sub(r'● Baforada \(3x / dia\):.*?(?=● Imunidade:)',lambda m:replacement,combined,flags=re.S)
    # The draconato's color is chosen by the GM: its own five options are valid.
    d['system']['biography']=description(combined,n)
    # Do not let the last inherited trait absorb a following species header,
    # introduction or stat block. Each source fragment is parsed separately.
    stat=next(j for j,l in enumerate(own) if l['text'].startswith('CA:'))
    first_trait=next((j for j in range(stat+1,len(own)) if own[j]['text'].startswith('●')),len(own))
    correct=traits(joined(common))+traits(joined(family))+traits(joined(own[first_trait:]))
    if d['name'].startswith('Dragão '):
        correct=[replacement.lstrip('● ').strip() if t.startswith('Baforada (3x / dia):') else t for t in correct]
    # Same-named inherited and specific powers form one record, with both
    # applicable effects. Distinct records must never share an embedded ID.
    unique={}
    for text in correct:
        label=text.split(':')[0][:90]
        if label in unique:unique[label]+='\n\n'+text
        else:unique[label]=text
    correct=list(unique.values())
    existing={t['name']:t for t in d['items'] if t['type']=='ability'}
    repaired=[]
    for weapon in [t for t in d['items'] if t['type']=='weapon']:
        weapon['system']['description']=description(f'{weapon["name"]}: {weapon["system"]["properties"]}.\n\nCada clique rola um ataque; repita conforme a quantidade indicada no nome.',n)
        repaired.append(weapon)
    for index,text in enumerate(correct):
        label=text.split(':')[0][:90]
        if label in existing: t=existing[label]
        else:
            t={'_id':uid(d['name']+str(index)+label),'name':label,'type':'ability','img':d['img'],
               'system':{},'flags':{'d20age':{'source':'d20age RPG - LB (V2)','page':n-5,'pdfPage':n}}}
        t['system']['description']=description(text,n);repaired.append(t)
        old=next((x for x in before['abilities'] if x['name']==d['name']+' · '+label and not x['system'].get('properties')),None)
        standalone=copy.deepcopy(old or t)
        standalone['_id']=old['_id'] if old else uid('ability'+d['name']+' · '+label+str(n))
        standalone['name']=d['name']+' · '+label
        standalone['system']['description']=t['system']['description']
        if not old:
            template=next(x for x in before['abilities'] if x['name'].startswith(d['name']+' · ')) if any(x['name'].startswith(d['name']+' · ') for x in before['abilities']) else None
            if template:
                standalone['folder']=template['folder'];standalone['img']=template['img']
                standalone['flags']['d20age']['folderPath']=template['flags']['d20age']['folderPath']
        creature_abilities.append(standalone)
    previous_items=next((x['items'] for x in before['bestiary'] if x['_id']==d['_id']),d['items'])
    for t in previous_items:
        if t['type']=='ability' and t['_id'] not in {x['_id'] for x in repaired}:
            # Preserve the valid attack-only special fallback.
            if t['name']=='Ataque especial':
                t=copy.deepcopy(t)
                t['system']['description']=description('Ataque: '+d['flags']['d20age']['rawStats']['Atq']+'\n\nResolva o efeito conforme os poderes desta criatura.',n);repaired.append(t)
            else: retired.setdefault('embedded',{}).setdefault(d['_id'],[]).append(t['_id'])
    d['items']=repaired
D['abilities']=noncreature+list({d['_id']:d for d in creature_abilities}.values())
ability_folders={f['_id']:f['flags']['d20age']['path'].split('/') for f in read('folders')['abilities']}
for d in D['abilities']:d['flags']['d20age']['folderPath']=ability_folders[d['folder']]
for d in before['abilities']:
    if d['_id'] not in {x['_id'] for x in D['abilities']}: retired.setdefault('abilities',[]).append(d['_id'])

# Magic records: cut category spillover; own item variants remain in that item.
equipment={d['name']:d for d in D['equipment']}
for d in D['magic-items']:
    n=d['flags']['d20age']['pdfPage'];text=body(d['system']['description'])
    if d['name']=='Pedra anã':text=text.split('ARMAS, ARMADURAS E ESCUDOS')[0].strip()
    if d['type'] in ['weapon','armor'] and re.search(r' \+[123]$',d['name']):
        bonus=d['name'][-1];base=d['name'][:-3]
        text=body(equipment[base]['system']['description'])+f'\n\nEncantamento +{bonus}. Consulte as propriedades especiais do livro.'
        text+='\n\n'+source(equipment[base]['flags']['d20age']['pdfPage'])
    if d['name']=='Pedra iônica':
        text=text.split('Tabela - Tipos de pedras iônicas')[0].split('Tipos de pedra (1d8):')[0].strip()
        table=next(t for t in D['rolltables'] if t['name']=='Tipos de pedras iônicas')
        text+='\n\nTipos de pedra (1d8):\n\n'+'\n\n'.join(f'{r["range"][0]}. '+r['flags']['d20age']['text'] for r in table['results'])
    d['system']['description']=description(text,n)

# Finish audit metadata after references are isolated by repair-reference-text.py.
for kind,docs in D.items():
    for d in docs:
        d.setdefault('flags',{}).setdefault('d20age',{})['descriptionRevision']=REVISION
        if kind=='bestiary':
            for item in d['items']: item.setdefault('flags',{}).setdefault('d20age',{})['descriptionRevision']=REVISION
            old_actor=next((x for x in before[kind] if x['_id']==d['_id']),None)
            for item in d['items']:
                old_item=next((x for x in (old_actor or {}).get('items',[]) if x['_id']==item['_id']),None)
                if old_item and old_item['system']['description']!=item['system']['description']:
                    hash_value=hashlib.sha256(old_item['system']['description'].encode()).hexdigest()
                    old_hashes.setdefault('embedded:'+d['_id'],{}).setdefault(item['_id'],[]).append(hash_value)
                    old_descriptions[hash_value]=old_item['system']['description']
        if kind=='rolltables':
            for row in d['results']:row['flags']['d20age']['descriptionRevision']=REVISION
        path='system.biography' if kind=='bestiary' else 'system.description' if kind in ['equipment','spells','abilities','magic-items'] else 'description' if kind=='rolltables' else None
        old=next((x for x in before[kind] if x['_id']==d['_id']),None)
        if path:
            value=d['system'][path.split('.')[1]] if path.startswith('system.') else d[path]
            assert value and '\n ' not in value, (kind,d['name'])
            oldvalue=(old['system'][path.split('.')[1]] if path.startswith('system.') else old[path]) if old else ''
            if oldvalue!=value:
                hash_value=hashlib.sha256(oldvalue.encode()).hexdigest()
                old_hashes.setdefault(kind,{}).setdefault(d['_id'],[]).append(hash_value)
                old_descriptions[hash_value]=oldvalue
        audit.append({'pack':kind,'id':d['_id'],'name':d['name'],'pdfPage':d['flags']['d20age'].get('pdfPage'),'review':'individual source boundary' if path else 'specific table / executable command','changed':bool(path and value!=oldvalue)})
    write(kind,docs)
for ids in retired.values():
    if isinstance(ids,list):ids[:]=sorted(set(ids))
    else:
        for key,values in ids.items():ids[key]=sorted(set(values))
retired['abilities']=[i for i in retired.get('abilities',[]) if i not in {d['_id'] for d in D['abilities']}]
for actor in D['bestiary']:
    if actor['_id'] in retired.get('embedded',{}):
        retired['embedded'][actor['_id']]=[i for i in retired['embedded'][actor['_id']] if i not in {d['_id'] for d in actor['items']}]
for pack,entries in old_hashes.items():
    for key,values in entries.items():entries[key]=sorted(set(values))
write('description-migration',{'revision':REVISION,'retired':retired,'oldHashes':old_hashes,'oldDescriptions':old_descriptions})
write('description-audit',{'revision':REVISION,'source':'d20age RPG - LB (V2)','counts':{k:len(v) for k,v in D.items()},'embeddedRecords':sum(len(d['items']) for d in D['bestiary']),'records':audit,
 'embedded':[{'actorId':a['_id'],'actor':a['name'],'id':i['_id'],'name':i['name'],'pdfPage':i['flags']['d20age']['pdfPage'],'review':'individual attack / applicable inherited or species power'} for a in D['bestiary'] for i in a['items']],
 'tableResults':[{'tableId':t['_id'],'table':t['name'],'id':r['_id'],'range':r['range'],'pdfPage':t['flags']['d20age']['pdfPage'],'review':'one result / one table row'} for t in D['rolltables'] for r in t['results']]})
catalog=read('catalog');catalog['version']=REVISION;catalog['counts']={k:len(v) for k,v in D.items()};write('catalog',catalog)
catalog['icons']=len({x['img'] for docs in D.values() for d in docs for x in [d]+d.get('items',[])})
write('catalog',catalog)
print(json.dumps({'counts':catalog['counts'],'embedded':sum(len(d['items']) for d in D['bestiary']),'retiredAbilities':len(retired.get('abilities',[]))}))

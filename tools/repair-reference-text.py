"""Individual reference tables; keep facsimiles as explicitly named context pages."""
from pathlib import Path
import html, json, hashlib, re, subprocess
R=Path(__file__).resolve().parents[1];C=R/'content'
def read(n):return json.loads((C/(n+'.json')).read_text())
def write(n,d):(C/(n+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def uid(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
P={int(k):v for k,v in read('source-lines').items()};refs=read('references');tables=read('rolltables');equipment=read('equipment')
aliases={
 'Armadura / escudo mágico':['Armaduras e escudos mágicos'], 'Armas em geral':['Armas mágicas'],
 'Armas; armaduras e escudos':['Armas e proteções especiais'], 'Efeitos mágicos do olho tirano':['Olho tirano · tentáculos oculares'],
 'Espadas':['Espadas mágicas'], 'Miscelâneas especiais':['Miscelâneas especiais'],
 'Ofícios comuns e profissionais':['Ofícios comuns','Ofícios profissionais'],
 'Propriedade mágica extra':['Propriedades de armadura e escudo'], 'Propriedades especiais':['Propriedades de arma'],
 'Reação (negociação)':['Reação · contratação'], 'Reação (geral)':['Reação geral'],
 'Miscelânea x utensílio':['Joias · tamanho e valor'], 'Manias e singularidades':[],
 'Magias de 1º círculo':['Magias · círculo 1'],'Magias de 2º círculo':['Magias · círculo 2'],
 'Magias de 3º círculo':['Magias · círculo 3'],'Magias de 4º círculo':['Magias · círculo 4'],
 'Magias de 5º círculo':['Magias · círculo 5'],'Magias de 6º círculo':['Magias · círculo 6']}
# Exact line boundaries, audited against the source table headings. No full-page fallback.
spans={
 'Altura e distância em HEX':[(89,29,61)], 'Chance em 6 (x:6)':[(67,0,33)],
 'Clima / estação':[(100,44,67)],'Detalhes internos':[(83,26,61)], 'DV x SV':[(121,8,87)],
 'DV x XP':[(122,30,86)], 'Estalagens e tabernas':[(55,65,83)],
 'Fases da lua':[(101,28,41)],'Idiomas':[(60,20,79)],'Implementos':[(36,32,41)],
 'Itens especiais':[(164,61,72)], 'Luminosidade':[(100,77,163)],
 'Manias e singularidades':[(170,0,0)], # replaced below by its own heading boundary
 'Marcas arcanas':[(38,0,0)], # uses its rollable table
 'Mod de CA x agilidade':[(119,95,110)],'Mod de CA x tamanho':[(119,85,95)],
 'Modificadores de atributos':[(23,6,35)], 'Movimento e deslocamento':[(69,14,61)],
 'Preço geral de construções':[(82,25,50)],'Profissionais':[(83,67,87)],
 'Ritmo de incursão':[(87,7,38)],'Tamanho e massa':[(119,45,73)],
 'Taxa de conversão de moedas':[(162,16,27)],'Unidades ficcionais':[(19,25,63)],
 'un: Movimento (opcional)':[(195,49,65)],'un: Equipamentos (opcional)':[(195,72,99)],
 'Zonas de jogo':[(66,67,len(P[66]))], 'Escama e baforada · draconato':[(139,47,71)],
 'Escama e baforada · dragão':[(140,25,52)],'Tesouros por tipo · covis':[(163,0,68)],
 'Tesouros por tipo · individuais':[(163,68,85)]}
def table(headers,rows):
    return '<table><thead><tr>'+''.join('<th>'+html.escape(str(c))+'</th>' for c in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(str(c))+'</td>' for c in row)+'</tr>' for row in rows)+'</tbody></table>'
def rolltable(t):return '<h3>'+html.escape(t['name'])+'</h3>'+table(['Lance ('+t['formula']+')','Resultado'],[(str(r['range'][0]) if r['range'][0]==r['range'][1] else str(r['range'][0])+'–'+str(r['range'][1]),r['flags']['d20age']['text']) for r in t['results']])
def transcript(n,start,end):
    # The source extraction splits two-column layouts. Restore physical reading
    # rows within this single selected table, including wrapped cells.
    rows=[]
    for l in sorted(P[n][start:end],key=lambda l:(round(l['y']/2)*2,l['x'])):
        if rows and abs(rows[-1][0]-l['y'])<2:rows[-1][1].append(l)
        else:rows.append([l['y'],[l]])
    return '<div class="source-table-transcription">'+''.join('<p>'+html.escape(' · '.join(l['text'] for l in sorted(row,key=lambda l:l['x'])))+'</p>' for y,row in rows)+'</div>'
classes=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CLASSES,progression} from './scripts/rules.mjs'; console.log(JSON.stringify(Object.fromEntries(Object.entries(CLASSES).map(([id,c])=>[c.label,Array.from({length:10},(_,i)=>({...progression(id,i+1),level:i+1,die:c.die}))]))));"],cwd=R,text=True))
class_alias={'Povo anão':'Anão','Povo elfo':'Elfo','Povo gnomo':'Gnomo'}
for d in refs:
    name=d['name'];n=d['flags']['d20age']['pdfPage'];text=''
    if name=='Ervas medicinais':
        docs=[x for x in equipment if x['system'].get('properties')=='Erva medicinal']
        text=table(['Erva (dose)','Valor (po)','Tratamento no jogo'],[(x['name'],x['system']['price'],x['system']['description'].split('\n\nLivro')[0]) for x in docs])
    elif name in ['Armaduras e escudos','Armas e munições','Miscelâneas','Utensílios','Veículos','Máquinas de guerra']:
        page={'Armaduras e escudos':53,'Armas e munições':54,'Miscelâneas':51,'Utensílios':52,'Veículos':56,'Máquinas de guerra':57}[name]
        docs=[x for x in equipment if x['flags']['d20age']['pdfPage']==page]
        text=table(['Registro','Valor (po)','Massa (cn)','Descrição'],[(x['name'],x['system'].get('price',0),x['system'].get('weight',0),x['system']['description'].split('\n\nLivro')[0]) for x in docs])
    elif name=='Animais':text=table(['Animal','Valor (po)'],[(P[55][i]['text'],P[55][i+1]['text']) for i in range(97,115,2)])
    elif name in classes or name in class_alias:
        rows=classes[class_alias.get(name,name)]
        text=table(['Nível','XP','DV','TAC0','SV (M/C/P/I/F)','Magias por círculo'],[(r['level'],r['xp'],f'{r["level"]}d{r["die"]}',r['thac0'],' / '.join(str(x) for x in r['saves'].values()),' / '.join(map(str,r['slots']))) for r in rows])
    elif name=='Conversão TAC0 X BA | CA X CAA':text=table(['TAC0','BA','CA','CAA'],[(19-i,i,9-i,10+i) for i in range(10)])
    elif name=='Corrupções':
        # d20+10 contains all thirty entries once.
        text=rolltable(next(t for t in tables if t['name']=='Corrupções · círculo 5'))
    elif name=='Encontros aleatórios':text=''.join(rolltable(t) for t in tables if t['name'].startswith('Encontros · '))
    elif name=='Magia oculta':
        spell=next(t for t in tables if t['name']=='Magias · círculo 1')
        text='<p>Escolha ou sorteie a magia vinculada ao implemento arcano (símbolo sagrado). Durante a conjuração, o magista pode converter espontaneamente uma magia memorizada em sua magia oculta.</p>'+rolltable(spell)
    elif name.startswith('Flor do tempo - '):
        text='<p>Diagrama de clima e tempo da estação '+html.escape(name.split(' - ')[1])+'. A imagem de consulta reproduz o diagrama do Livro Base.</p>'
    elif name=='Manias e singularidades':
        a=P[n];start=next(i for i,l in enumerate(a) if l['text']=='Tabela 3 - Manias e singularidades')
        # This table occupies the end of its column, not the next column's table.
        col=a[start]['x']>210;section=[l for l in a[start:] if (l['x']>210)==col]
        text=table(['Lance (1d20)','Mania ou singularidade'],[(section[i]['text'].replace('11+','11–20'),section[i+1]['text']) for i in range(3,len(section),2)])
    elif name in spans:
        text=''.join(transcript(*span) for span in spans[name])
    else:
        targets=aliases.get(name,[name]);matched=[t for t in tables if t['name'] in targets]
        assert matched,(name,'Missing explicit reference boundary')
        text=''.join(rolltable(t) for t in matched)
    assert text and '<pre>' not in text,name
    if name=='Tesouros por tipo · individuais':
        n=163;d['flags']['d20age'].update(page=158,pdfPage=163)
        for p in d['pages']:
            if p['type']=='image':p['src']='systems/d20age/assets/reference/page-158.webp'
    content='<article class="d20age-reference" lang="pt-BR" style="text-align:justify;line-height:1.6;overflow-wrap:anywhere"><h2>'+html.escape(name)+'</h2>'+text+f'<p><small>Livro Base V2, p. {n-5}.</small></p></article>'
    page=next((p for p in d['pages'] if p['type']=='text'),None)
    if not page:
        page={'_id':uid('text'+name),'type':'text'};d['pages'].insert(0,page)
    page.update(name=name+' · consulta',sort=0,text={'format':1,'content':content},flags={'d20age':{'descriptionRevision':'0.4.7'}})
    for i,p in enumerate(d['pages']):
        if p['type']=='image':p['sort']=10+i;p['name']='Página original · contexto do Livro Base'
    d['pages'].sort(key=lambda p:p['sort'])
write('references',refs)
print('92 referências: textos individuais e páginas originais identificadas como contexto.')

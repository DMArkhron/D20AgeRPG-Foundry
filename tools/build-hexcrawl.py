"""Import the reviewed dual-style Hexcrawl atlas into Foundry system assets."""
from pathlib import Path
import argparse, hashlib, json, zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path,help='Pacote ZIP revisado com pastas colorido/ e preto-e-branco/')
source = parser.parse_args().source
groups = {
    'Terrenos': ['floresta','bosque','colinas','montanhas','pantano','deserto','tundra'],
    'Águas': ['rio','lago','costa'],
    'Caminhos': ['estrada','trilha','ponte'],
    'Povoados': ['vila','vilarejo','cidade'],
    'Fortificações': ['fortaleza','torre'],
    'Locais de aventura': ['ruinas','templo','masmorra','caverna','covil','cemiterio','acampamento','santuario','marco'],
}
labels = dict(zip(
    [s for slugs in groups.values() for s in slugs],
    ['Floresta','Bosque','Colinas','Montanhas','Pântano','Deserto','Tundra','Rio','Lago','Costa','Estrada','Trilha','Ponte','Vila','Vilarejo','Cidade','Fortaleza','Torre','Ruínas','Templo','Masmorra','Caverna','Covil','Cemitério','Acampamento','Santuário','Marco antigo']
))
assert len(labels) == 27
uid = lambda value: hashlib.sha256(('d20age-hexcrawl-'+value).encode()).hexdigest()[:16]
base = 'systems/d20age/assets/hexcrawl'
dest = root/'assets/hexcrawl'
dest.mkdir(parents=True,exist_ok=True)
docs=[]
with zipfile.ZipFile(source) as archive:
    assert archive.testzip() is None
    prefixes={name.split('colorido/')[0] for name in archive.namelist() if '/colorido/' in name and name.endswith('.jpg')}
    assert len(prefixes)==1, 'O ZIP deve conter uma pasta colorido/ única.'
    prefix=prefixes.pop()
    for group, slugs in groups.items():
        for slug in slugs:
            for variant, folder in [('color','colorido'),('bw','preto-e-branco')]:
                data=archive.read(f'{prefix}{folder}/{slug}.jpg')
                path=dest/variant/f'{slug}.jpg'
                path.parent.mkdir(parents=True,exist_ok=True)
                path.write_bytes(data)
            name=labels[slug]
            pages=[]
            for index,(variant,title) in enumerate([('color','Colorido'),('bw','Preto e branco')]):
                pages.append({'_id':uid(slug+'-'+variant),'name':title,'type':'image','src':f'{base}/{variant}/{slug}.jpg','image':{'caption':f'{name} · {title}'},'sort':index*100000})
            docs.append({'_id':uid(slug),'name':name,'img':pages[0]['src'],'pages':pages,
                         'flags':{'d20age':{'hexcrawl':slug,'category':group,'assetVersion':'1'}}})
(root/'content/hexcrawl.json').write_text(json.dumps(docs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(docs)} entries; {len(list(dest.rglob("*.jpg")))} images')

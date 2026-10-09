from pathlib import Path
import base64
import json
import re
# Shared generator engine and visual stages are embedded in the offline sheet preview.

root = Path(__file__).resolve().parents[1]
samples = json.loads((root / "preview/sample.json").read_text())
image = "data:image/svg+xml;base64," + base64.b64encode((root / "assets/crest.svg").read_bytes()).decode()
for actor in samples.values():
    actor["img"] = image
def module_source(path):
    source = (root / path).read_text()
    source = re.sub(r'^import[^\n]*\n', '', source, flags=re.M)
    return re.sub(r'\bexport (?=(const|function|class)\b)', '', source)
code = '\n'.join(module_source(path) for path in ['scripts/languages.mjs','scripts/preferences.mjs','scripts/rules.mjs','scripts/memorization.mjs','scripts/spell-editor.mjs','scripts/initiative.mjs','scripts/view.mjs'])+'\n'
preview = module_source("preview/preview.mjs")
generator_content={n:json.loads((root/'content'/(n+'.json')).read_text()) for n in ['equipment','spells']}
generator_images={}
for path in [*(root/'assets/classes').glob('*.png'),*(root/'assets/icons').glob('*.svg')]:
    generator_images['systems/d20age/'+str(path.relative_to(root))]=('data:image/png;base64,' if path.suffix=='.png' else 'data:image/svg+xml;base64,')+base64.b64encode(path.read_bytes()).decode()
code += '\n' + module_source('scripts/generation.mjs')+'\n'+module_source('scripts/generator-controller.mjs')+'\n'+module_source('scripts/generator-view.mjs')+'\nconst previewGeneratorImages='+json.dumps(generator_images)+';\n'
preview=preview.replace('const generatorContent=Object.fromEntries(await Promise.all(["equipment","spells"].map(async n=>[n,await (await fetch("../content/"+n+".json")).json()])));','const generatorContent='+json.dumps(generator_content,ensure_ascii=False).replace('<','\\u003c')+';')
preview = preview.replace('const samples=await (await fetch("./sample.json")).json();', 'const samples=' + json.dumps(samples, ensure_ascii=False) + ';')
code += "\n" + module_source("scripts/adjustments.mjs") + "\n" + module_source("scripts/chat.mjs") + "\n" + module_source("scripts/descriptions.mjs") + "\n" + preview
html = (root / "preview/index.html").read_text()
css = (root / "styles/d20age.css").read_text()
def embed_asset(match):
    asset = (root / "styles" / match.group(1)).resolve()
    if not asset.is_relative_to(root):
        raise ValueError("Asset fora do pacote")
    encoded = base64.b64encode(asset.read_bytes()).decode()
    return 'url("data:' + ('image/png' if asset.suffix == '.png' else 'image/svg+xml') + ';base64,' + encoded + '")'
css = re.sub(r'url\("([^"\n]+\.(?:svg|png))"\)', embed_asset, css)
html = html.replace('<link rel="stylesheet" href="../styles/d20age.css">', '<style>' + css + '</style>')
html = html.replace('<script type="module" src="./preview.mjs"></script>', '<script type="module">' + code.replace('</script', '<\\/script') + '</script>')
for filename,mime in [("cover.png","image/png"),("mapas-de-pergaminho.mp3","audio/mpeg")]:
    encoded = base64.b64encode((root / "assets" / filename).read_bytes()).decode()
    html = html.replace("../assets/"+filename,"data:"+mime+";base64,"+encoded)
output = root.parent / "output" / "d20age-ficha-previa.html"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(html)
print(output)

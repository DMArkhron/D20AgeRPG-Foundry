"""Recorta o fundo externo dos ícones hexagonais e salva PNG com alfa."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'assets' / 'hexcrawl'
for source in root.glob('*/*.jpg'):
    image = Image.open(source).convert('RGBA')
    w, h = image.size
    mask = Image.new('L', (w, h), 0)
    # A borda preta original é preservada; o papel externo fica transparente.
    points = [(0.5, 0.015), (0.936, 0.275), (0.936, 0.737),
              (0.5, 0.996), (0.064, 0.737), (0.064, 0.275)]
    ImageDraw.Draw(mask).polygon([(round(x*w), round(y*h)) for x,y in points], fill=255)
    image.putalpha(mask)
    image.thumbnail((512, 512), Image.Resampling.LANCZOS)
    image.save(source.with_suffix('.png'), optimize=True)
    source.unlink()
print('54 ícones hexagonais transparentes gerados.')

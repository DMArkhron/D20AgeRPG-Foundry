"""Build gate: current tests plus unchanged tests from the previous build."""
from pathlib import Path
import argparse
import json
import shutil
import subprocess
import tempfile
import time
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / 'regression/previous-tests.zip'
IGNORED = {'.git', 'node_modules', '__pycache__', 'output'}

def run(args, root):
    subprocess.run(args, cwd=root, check=True)

def suite(root):
    tests = sorted((root / 'tests').glob('*.test.mjs'))
    if not tests:
        raise RuntimeError('Nenhum teste encontrado; a verificação não pode passar vazia.')
    run(['node', '--test', *[str(p.relative_to(root)) for p in tests]], root)

def validate(root):
    manifest = json.loads((root / 'system.json').read_text())
    package = json.loads((root / 'package.json').read_text())
    if manifest['version'] != package['version']:
        raise RuntimeError('Versões divergentes em system.json e package.json.')
    for name in manifest.get('esmodules', []) + manifest.get('styles', []) + [x['path'] for x in manifest.get('languages', [])]:
        if not (root / name).is_file():
            raise RuntimeError('Arquivo do manifesto ausente: ' + name)
    for p in sorted((root / 'scripts').rglob('*.mjs')):
        run(['node', '--check', str(p)], root)
    for folder in ('content', 'lang'):
        for p in (root / folder).glob('*.json'):
            json.loads(p.read_text())

def baseline_suite(previous, current):
    with tempfile.TemporaryDirectory(prefix='d20age-regression-') as temp:
        stage = Path(temp)
        # Real copies of code avoid module resolution accidentally using the old tree.
        for p in current.iterdir():
            if p.name in IGNORED | {'tests', 'regression'}:
                continue
            if p.name == 'assets':
                # Read-only test inputs from the candidate build.
                shutil.copytree(p, stage / p.name)
            elif p.is_dir():
                shutil.copytree(p, stage / p.name, ignore=shutil.ignore_patterns(*IGNORED))
            else:
                shutil.copy2(p, stage / p.name)
        if previous:
            shutil.copytree(previous / 'tests', stage / 'tests')
        else:
            if not BASELINE.is_file():
                raise RuntimeError('Baseline ausente. Não é permitido aprovar sem testes anteriores.')
            with zipfile.ZipFile(BASELINE) as archive:
                for name in archive.namelist():
                    path = Path(name)
                    if path.is_absolute() or '..' in path.parts or path.parts[0] != 'tests':
                        raise RuntimeError('Caminho inválido no baseline.')
                archive.extractall(stage)
        suite(stage)

def check(previous=None):
    if previous:
        print('\n[1/4] Build anterior: seus próprios testes', flush=True)
        validate(previous)
        suite(previous)
    print('\n[2/4] Sintaxe, manifesto e JSON da build atual', flush=True)
    validate(ROOT)
    print('\n[3/4] Testes atuais', flush=True)
    suite(ROOT)
    print('\n[4/4] Testes anteriores sobre o código atual', flush=True)
    baseline_suite(previous, ROOT)
    print('\nAPROVADO: build e regressão verificadas.', flush=True)

def snapshot():
    BASELINE.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(BASELINE, 'w', zipfile.ZIP_DEFLATED) as archive:
        for p in sorted((ROOT / 'tests').rglob('*')):
            if p.is_file():
                archive.write(p, p.relative_to(ROOT))
    (BASELINE.parent / 'baseline.json').write_text(json.dumps({
        'version': json.loads((ROOT / 'system.json').read_text())['version'],
        'purpose': 'Testes anteriores preservados; atualização somente após revisão explícita.'
    }, indent=2, ensure_ascii=False) + '\n')

def fingerprint():
    return tuple((str(p.relative_to(ROOT)), p.stat().st_mtime_ns, p.stat().st_size)
                 for p in sorted(ROOT.rglob('*')) if p.is_file()
                 and not any(part in IGNORED for part in p.relative_to(ROOT).parts))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--previous', type=Path, help='Diretório da build anterior completa')
    parser.add_argument('--watch', action='store_true', help='Verificar novamente após salvar arquivos')
    parser.add_argument('--accept-baseline', action='store_true', help='Após aprovação, substituir explicitamente o baseline')
    args = parser.parse_args()
    previous = args.previous.resolve() if args.previous else None
    if args.watch and args.accept_baseline:
        parser.error('O modo watch não pode alterar o baseline.')
    if not args.watch:
        check(previous)
        if args.accept_baseline:
            snapshot()
        return
    last = None
    while True:
        now = fingerprint()
        if now != last:
            last = now
            try:
                check(previous)
            except (subprocess.CalledProcessError, RuntimeError, ValueError, OSError) as error:
                print('REPROVADO:', error, flush=True)
        time.sleep(1)

if __name__ == '__main__':
    main()

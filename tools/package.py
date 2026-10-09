from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "system.json").read_text())
target = root.parent / "output" / f"d20age-foundry-v13-{manifest['version']}.zip"
target.parent.mkdir(parents=True, exist_ok=True)
paths = sorted(p for p in root.rglob("*") if p.is_file() and not any(part in {"node_modules", ".git", "__pycache__"} for part in p.relative_to(root).parts))
staging = target.with_suffix(".zip.tmp")
with zipfile.ZipFile(staging, "w", zipfile.ZIP_DEFLATED) as archive:
    for source in paths:
        info = zipfile.ZipInfo(str(Path("d20age") / source.relative_to(root)), date_time=(2026, 10, 2, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, source.read_bytes())
with zipfile.ZipFile(staging) as verification:
    if verification.testzip() is not None:
        raise RuntimeError("Falha na integridade do ZIP")
staging.replace(target)
print(target)

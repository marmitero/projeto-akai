"""Exact crops from existing HUD/hero sprites; originals remain unchanged."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'docs/art/Runtime_Asset_Manifest.json'
manifest = json.loads(manifest_path.read_text())

def crop(key, source, box):
    image = Image.open(ROOT / source).convert('RGBA').crop(box)
    if key == 'health-fill':
        image.paste((255, 255, 255, 255), (0, 0, image.width, image.height))
    output = f'apps/client/src/assets/derived/{key}.png'
    image.save(ROOT / output)
    digest = lambda p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
    entry = {'key': key, 'output': output, 'sha256': digest(output), 'width': image.width, 'height': image.height,
             'sources': [{'path': source, 'sha256': digest(source)}], 'crop': list(box), 'licenseStatus': 'unverified', 'transform': 'crop; white fill mask' if key == 'health-fill' else 'crop only'}
    manifest['derivatives'] = [d for d in manifest['derivatives'] if d['key'] != key] + [entry]

crop('hero-portrait', 'apps/client/src/assets/derived/hero-idle.png', (71, 63, 90, 87))
for i in range(4):
    crop(f'floor-paper-{i}', 'sprites/Hud/20250420manaTabB-Sheet.png', (i * 31, 0, (i + 1) * 31, 45))
crop('health-frame', 'sprites/Hud/20250421barB-Sheet.png', (0, 0, 96, 16))
crop('health-fill', 'sprites/Hud/20250421barB-Sheet.png', (8, 5, 88, 10))
coin = 'sprites/Misc/Tools/Icon286.png'
if not any(item['path'] == coin for item in manifest['originals']):
    image = Image.open(ROOT / coin)
    manifest['originals'].append({'path': coin, 'sha256': hashlib.sha256((ROOT / coin).read_bytes()).hexdigest(), 'width': image.width, 'height': image.height, 'licenseStatus': 'unverified'})
manifest['stage'] = 'Battle HUD polish P2'
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

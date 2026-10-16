"""Pad existing walk frames to the runtime pivot without resampling or altering sources."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [f"sprites/Enemies/Skeleton/PNG/walk-{i}.png" for i in range(1, 7)]
OUTPUT = "apps/client/src/assets/derived/skeleton-walk.png"
canvas = Image.new("RGBA", (160 * 6, 128))
for index, source in enumerate(SOURCES):
    # Source foot pivot (44,96) becomes (80,112) in the normalized frame.
    canvas.alpha_composite(Image.open(ROOT / source).convert("RGBA"), (index * 160 + 36, 16))
canvas.save(ROOT / OUTPUT)


def hash_file(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


manifest_path = ROOT / "docs/art/Runtime_Asset_Manifest.json"
manifest = json.loads(manifest_path.read_text())
manifest["stage"] = "Battle presentation polish P1"
manifest["derivatives"] = [item for item in manifest["derivatives"] if item["key"] != "skeleton-walk"]
manifest["derivatives"].append({
    "key": "skeleton-walk",
    "output": OUTPUT,
    "sha256": hash_file(OUTPUT),
    "width": 960,
    "height": 128,
    "sources": [{"path": source, "sha256": hash_file(source)} for source in SOURCES],
    "licenseStatus": "unverified",
    "frameWidth": 160,
    "frameHeight": 128,
    "frames": 6,
    "pivot": [80, 112],
    "sourcePivot": [44, 96],
    "offset": [36, 16],
    "fps": 10,
    "direction": "right; runtime flipX for enemy left",
})
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

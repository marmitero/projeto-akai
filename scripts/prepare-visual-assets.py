"""Rebuild F2 derivatives without modifying originals. Requires Pillow; not needed for npm build."""
from pathlib import Path
import json, hashlib, re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'apps/client/src/assets/derived'
OUT.mkdir(parents=True,exist_ok=True)
entries=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def export(name, image, sources, **meta):
 p=OUT/(name+'.png');image.save(p)
 entries.append(dict(key=name,output=str(p.relative_to(ROOT)),sha256=sha(p),width=image.width,height=image.height,
 sources=[dict(path=s,sha256=sha(ROOT/s)) for s in sources],licenseStatus='unverified',**meta))
def crop(name,source,rect,flip=False):
 image=Image.open(ROOT/source).convert('RGBA').crop(rect)
 if flip:image=image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 export(name,image,[source],crop=list(rect),flipY=flip,scale=1)
def hero(action,fw,n,fh=80):
 source=f'sprites/Character/{action}/{action}-Sheet.png'
 im=Image.open(ROOT/source).convert('RGBA');out=Image.new('RGBA',(160*n,128))
 # Dead has different floor contacts than Idle/Attack; measured, explicit landmarks.
 origins=[48,50,48,48,48,48,48,53] if action=='Dead' else [64]*n
 for i in range(n):out.alpha_composite(im.crop((i*fw,0,(i+1)*fw,fh)),(i*160+80-fw//2,112-origins[i]))
 export('hero-'+action.lower(),out,[source],frameWidth=160,frameHeight=128,frames=n,pivot=[80,112],sourceFrame=[fw,fh],sourcePivots=[[fw//2,y] for y in origins],frameOffsets=[[80-fw//2,112-y] for y in origins],fps=10,margin=0,spacing=0,direction='right')
hero('Idle',64,4);hero('Attack-01',96,8);hero('Dead',80,8,64)
for action,n,prefix in [('idle',4,'idle-'),('attack',8,'attack-A'),('dead',4,'dead-')]:
 sources=[f'sprites/Enemies/Skeleton/PNG/{prefix}{i}.png' for i in range(1,n+1)]
 out=Image.new('RGBA',(160*n,128))
 for i,s in enumerate(sources):out.alpha_composite(Image.open(ROOT/s).convert('RGBA'),(i*160+36,16))
 export('skeleton-'+action,out,sources,frameWidth=160,frameHeight=128,frames=n,pivot=[80,112],sourcePivot=[44,96],offset=[36,16],fps=8 if action=='idle' else 10,margin=0,spacing=0,direction='right; runtime flipX for enemy left')
for name,src,rect in [
 ('nav-normal','20250420manaTabD-Sheet.png',(0,0,96,32)),('nav-active','20250420manaTabD-Sheet.png',(96,0,192,32)),('nav-pressed','20250420manaTabD-Sheet.png',(192,0,288,32)),('nav-disabled','20250420manaTabD-Sheet.png',(288,0,384,32)),
 ('button-normal','20250421manaSoulButtonB-Sheet.png',(0,0,96,22)),('button-active','20250421manaSoulButtonB-Sheet.png',(192,0,288,22)),
 ('options','20250425optionsButton-Sheet.png',(0,0,32,32)),('close','20250425closeButton-Sheet.png',(0,0,32,32)),('slot','20250423emptyFrame-Sheet.png',(0,0,32,32))]:crop(name,'sprites/Hud/'+src,rect)
crop('grass','sprites/Tiles/Floor Tiles1.png',(32,0,64,32))
crop('rock-top','sprites/Tiles/Floor Tiles1.png',(32,64,64,96),True)
crop('rock-fill','sprites/Tiles/Floor Tiles1.png',(32,32,64,64))
crop('rock-side','sprites/Tiles/Floor Tiles1.png',(0,32,32,64))
crop('torch','sprites/Assets/Torch.png',(0,32,192,64))
# Dust sheet is a verified 6×2 grid of 32px frames; last cell is intentionally empty.
im=Image.open(ROOT/'sprites/Effects/21.png').convert('RGBA')
export('dust',im,['sprites/Effects/21.png'],frameWidth=32,frameHeight=32,frames=12,fps=24,margin=0,spacing=0)
originals=[]
for source in sorted(set(re.findall(r"[\"']\.\./\.\./\.\./\.\./(sprites/[^\"']+)[\"']",(ROOT/'apps/client/src/assets/catalog.ts').read_text()))):
 im=Image.open(ROOT/source)
 originals.append(dict(path=source,sha256=sha(ROOT/source),width=im.width,height=im.height,licenseStatus='unverified'))
(ROOT/'docs/art/Runtime_Asset_Manifest.json').write_text(json.dumps(dict(version=1,stage='F2 visual preview; no economy',originals=originals,derivatives=entries),ensure_ascii=False,indent=2)+'\n')
print('Exported',len(entries),'derivatives; originals unchanged')

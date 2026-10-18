"""Reproducible common enemy atlases and complete original inventory. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw
import json,hashlib,re
R=Path(__file__).resolve().parents[1]; O=R/'apps/client/src/assets/derived'; D=R/'docs/bestiary';D.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[
('slime-green','Gosma do musgo','Slime','fighter',1),('slime-blue','Gosma do orvalho','Slime','runner',2),('slime-red','Gosma ferrugem','Slime','brute',3),('bat','Morcego das copas','Bat','runner',4),('mushroom','Cogumelo errante','Mushroom','tank',5),('dude','Pestinha do bosque','Dude_Monster','fighter',7),('owlet','Corujito feroz','Owlet Monster','runner',8),('pink','Espinheiro rosado','Pink Monster','brute',9),('skeleton','Ossada errante','Skeleton','fighter',11),('shield-skeleton','Sentinela de ossos','Shield Skeleton','tank',16),('lancer','Lanceiro sepulcral','Lancer Skeleton','brute',21),('archer','Arqueiro proscrito','Archer','ranged',25),('shadow','Sombra rastejante','Shadow','runner',41),('inquisitor','Inquisidor renegado','Inquisitor','tank',61),('warrior','Guerreiro exilado','Warrior','fighter',31),('zombie-1','Andarilho putrefato','Zombie_1','fighter',12),('zombie-2','Carcereiro pútrido','Zombie_2','tank',18),('zombie-3','Devorador das ruínas','Zombie_3','brute',24),('zombie-4','Corredor febril','Zombie_4','runner',32),('male-bandit','Saqueador da estrada','Male Base','fighter',6),('male-orc','Lenhador orc renegado','Male Base','brute',35),('male-deserter','Guarda desertor','Male Base','tank',45),('male-plague','Carrasco da peste','Male Base','fighter',71),('female-scout','Batedora renegada','Female Base','runner',14),('female-guard','Guarda da ruína','Female Base','tank',28),('female-cultist','Acólita da penumbra','Female Base','fighter',51),('female-revenant','Revenante escarlate','Female Base','brute',81)]
recipes={
'male-bandit':[('Skin','Male Skin2'),('Clothing','Pants'),('Clothing','Boots'),('Clothing','Shirt v2'),('Hair','Male Hair3'),('Hand','Iron Sword'),('Mask','Male Bandit Scarf')],
'male-orc':[('Skin','Male Orc skin'),('Clothing','Green Pants'),('Clothing','Boots'),('Clothing','Green Shirt v2'),('Hair','Male Hair7'),('Hand','Iron Axe')],
'male-deserter':[('Skin','Male Skin3'),('Clothing','Blue Pants'),('Clothing','Boots'),('Clothing','Chainmail'),('Hair','Male Hair12'),('Hat','Guard Helmet'),('Hand','Iron Sword')],
'male-plague':[('Skin','Male Ghost skin'),('Clothing','Purple Pants'),('Clothing','Boots'),('Clothing','Purple Shirt v2'),('Hair','Male Hair1'),('Hand','Bronze Axe'),('Mask','Male Plague Mask')],
'female-scout':[('Skin','Female Skin2'),('Clothing','Skirt'),('Clothing','Boots'),('Clothing','Green Bodice Long Sleeves'),('Hair','Female Hair3'),('Hand','Iron Sword')],
'female-guard':[('Skin','Female Skin3'),('Clothing','Skirt'),('Clothing','Boots'),('Clothing','Blue Bodice Long Sleeves'),('Hair','Female Hair12'),('Hand','Iron Sword')],
'female-cultist':[('Skin','Female Devil skin'),('Clothing','Skirt'),('Clothing','Boots'),('Clothing','Purple Bodice Long Sleeves'),('Hair','Female Hair20'),('Hat','Witch hat'),('Hand','Bronze Sword')],
'female-revenant':[('Skin','Female Ghost skin'),('Clothing','Skirt'),('Clothing','Boots'),('Clothing','Red Bodice Long Sleeves'),('Hair','Female Hair30'),('Hand','Iron Axe')]}
spec=[];entries=[];portraits=[]
def strip(p,fw,fh=None,row=0):
 im=Image.open(p).convert('RGBA');fh=fh or im.height
 return [im.crop((x,row*fh,x+fw,(row+1)*fh)) for x in range(0,im.width,fw)]
def numeric(p):return int(re.findall(r'\d+',p.stem)[-1])
for id,name,fam,role,unlock in rows:
 base=R/'sprites/Enemies'/fam;sources=set();layers=[]
 def seq(action):
  if id in recipes:
   sex=fam.split()[0];im=Image.new('RGBA',(800,448))
   for group,n in recipes[id]:
    p=base/f'{sex} {group}'/(n+'.png');sources.add(p);im.alpha_composite(Image.open(p).convert('RGBA'))
    rel=str(p.relative_to(R))
    if rel not in layers:layers.append(rel)
   y={'idle':0,'walk':1,'attack':5,'dead':6}[action]
   return [im.crop((x*80,y*64,(x+1)*80,(y+1)*64)) for x in range(10)],(40,64),1
  if fam=='Warrior':
   p=next(base.glob('*.png'));sources.add(p);y={'idle':7,'walk':8,'attack':14,'dead':16}[action]
   return strip(p,80,64,y),(40,64),1
  if fam.startswith('Zombie'):
   p=base/({'idle':'Idle','walk':'Walk','attack':'Attack','dead':'Dead'}[action]+'.png');sources.add(p)
   return strip(p,128),(64,126),1
  if fam=='Slime':
   p=base/('Slime '+id.split('-')[1]+'.png');sources.add(p)
   return strip(p,32,32,{'idle':0,'walk':0,'attack':1,'dead':2}[action]),(16,32),2
  if fam in ['Dude_Monster','Owlet Monster','Pink Monster']:
   pre=fam.replace(' ','_');suffix={'idle':'Idle_4','walk':'Run_6','attack':'Attack1_4','dead':'Death_8'}[action]
   p=base/f'{pre}_{suffix}.png';sources.add(p)
   return strip(p,32),(16,32),2
  if fam in ['Bat','Mushroom']:
   act={'idle':'IdleFly' if fam=='Bat' else 'Idle','walk':'Run','attack':'Attack1' if fam=='Bat' else 'Attack','dead':'Die'}[action]
   p=base/f'{fam}-{act}.png';sources.add(p);fw=64 if fam=='Bat' else 80
   return strip(p,fw),(fw//2,56 if fam=="Bat" else 64),1
  prefixes={'idle':'idle-','walk':'run-' if fam=='Archer' else 'walk-','attack':'attack-A','dead':'dead-'}
  pre=prefixes[action]
  if fam=='Inquisitor':pre={'idle':'idle-with-weapon-','walk':'walk-with-weapon-','attack':'attack-A','dead':'dead-'}[action]
  fs=sorted([p for p in (base/'PNG').rglob('*.png') if re.fullmatch(re.escape(pre)+r'\d+',p.stem,re.I)],key=numeric)
  if not fs:raise ValueError((fam,pre))
  sources.update(fs)
  return [Image.open(p).convert('RGBA') for p in fs],((48,80) if fam=='Inquisitor' else (44,96)),1
 atlas=Image.new('RGBA',(1280,512))
 for action,row,n in [('idle',0,4),('walk',1,6),('attack',2,8),('dead',3,8)]:
  frames,pivot,scale=seq(action)
  for i in range(n):
   fr=frames[round(i*(len(frames)-1)/max(1,n-1))]
   if scale!=1:fr=fr.resize((fr.width*scale,fr.height*scale),Image.Resampling.NEAREST)
   atlas.alpha_composite(fr,(i*160+80-pivot[0]*scale,row*128+112-pivot[1]*scale))
 p=O/f'bestiary-{id}.png';atlas.save(p)
 entries.append(dict(key=f'bestiary-{id}',output=str(p.relative_to(R)),sha256=sha(p),width=1280,height=512,frameWidth=160,frameHeight=128,frames=32,pivot=[80,112],sources=[dict(path=str(s.relative_to(R)),sha256=sha(s)) for s in sorted(sources)],licenseStatus='unverified'))
 spec.append(dict(id=id,name=name,family=fam,role=role,minFloor=unlock,layers=layers));portraits.append((name,atlas.crop((48,44,112,116))))
(R/'scripts/bestiary-spec.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
(R/'packages/shared/src/bestiary-data.ts').write_text('// Generated by scripts/prepare-bestiary-assets.py\nexport const ENEMY_TEMPLATES = '+json.dumps([{k:v for k,v in s.items() if k!='layers'} for s in spec],ensure_ascii=False,indent=2)+' as const;\n')
(R/'apps/client/src/assets/bestiary.ts').write_text('// Generated enemy atlases\nexport const bestiaryAssets = {\n'+''.join(f'  "{s["id"]}": new URL("./derived/bestiary-{s["id"]}.png", import.meta.url).href,\n' for s in spec)+'} as const;\n')
manp=R/'docs/art/Runtime_Asset_Manifest.json';man=json.loads(manp.read_text());man['derivatives']=[d for d in man['derivatives'] if not d['key'].startswith('bestiary-')]+entries;manp.write_text(json.dumps(man,ensure_ascii=False,indent=2)+'\n')
files=[]
for p in sorted((R/'sprites/Enemies').rglob('*')):
 if p.is_file():
  dimensions=None
  if p.suffix.lower()=='.png':dimensions=list(Image.open(p).size)
  files.append(dict(path=str(p.relative_to(R)),sha256=sha(p),dimensions=dimensions))
dirs={d.name:{'files':sum(1 for p in files if Path(p['path']).parts[2]==d.name),'png':sum(1 for p in files if Path(p['path']).parts[2]==d.name and p['dimensions'])} for d in sorted((R/'sprites/Enemies').iterdir()) if d.is_dir()}
(D/'asset-inventory.json').write_text(json.dumps(dict(files=len(files),png=sum(p['dimensions'] is not None for p in files),directories=dirs,entries=files),ensure_ascii=False,indent=2)+'\n')
contact=Image.new('RGBA',(1000,((len(portraits)+4)//5)*140),'#20172c');draw=ImageDraw.Draw(contact)
for i,(name,im) in enumerate(portraits):
 x=(i%5)*200;y=(i//5)*140;contact.alpha_composite(im,(x+68,y+12));draw.text((x+5,y+95),name,fill='#ffe2ac')
contact.convert('RGB').save(D/'contact-sheet.png');print('Generated',len(spec),'enemies;',len(files),'original files')

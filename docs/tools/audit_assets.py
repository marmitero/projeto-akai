"""Rebuild the complete asset inventory and representative contact sheets.

Run from repository root: python docs/tools/audit_assets.py
Requires Pillow. Originals are read only. No network calls.
"""
from pathlib import Path
from collections import Counter, defaultdict
import hashlib
import json
import subprocess
import re
from urllib.parse import quote
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs'
PREV = OUT / 'art/previews'

def link(path):
    return '../' + quote(path, safe='/')

def inspect():
    entries = []
    paths = subprocess.check_output(['git', 'ls-files', '-z', 'sprites/'], cwd=ROOT).decode().split('\0')
    for rel in sorted(filter(None, paths)):
        p = ROOT / rel
        raw = p.read_bytes()
        ext = p.suffix.lower()
        e = dict(id='asset_' + hashlib.sha256(rel.encode()).hexdigest()[:16], path=rel,
                 category=p.parts[len(ROOT.parts)+1], extension=ext or '(none)',
                 bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                 git_blob_sha1=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(),
                 license_status='unverified', attribution='unknown',
                 visual_status='not individually reviewed', animation_status='unmapped')
        if ext in ('.png','.gif','.psd'):
            try:
                with Image.open(p) as im:
                    e.update(format=im.format, width=im.width, height=im.height, mode=im.mode,
                             encoded_frames=getattr(im,'n_frames',1))
                    alpha=im.convert('RGBA').getchannel('A')
                    e['has_transparent_pixels']=alpha.getextrema()[0]<255
                    e['alpha_bbox']=alpha.getbbox()
                    if ext in ('.png','.gif'):
                        im.load()
                    if ext=='.gif':
                        durations=[]
                        for i in range(im.n_frames):
                            im.seek(i); durations.append(im.info.get('duration',0))
                        e['frame_durations_ms']=durations
                    e['technical_status']='decoded' if ext!='.psd' else 'Pillow composite/header read; layers not audited'
            except Exception as exc:
                e['technical_status']='error: '+str(exc)
        else:
            e['technical_status']='bytes/hash inventoried; editable source not rendered' if ext else 'OS metadata; exclude from runtime'
        if '/PNG Sequences/' in rel:
            e['kind']='animation_frame'; e['suggested_use']='Boss animation; natural numeric order within same action/direction'
        elif '/Vector Parts/' in rel:
            e['kind']='rig_part_or_source'; e['suggested_use']='Authoring only; do not render as complete actor'
        elif ext in ('.ase','.aseprite','.ai','.eps','.psd','.scml'):
            e['kind']='editable_source'; e['suggested_use']='Authoring; do not preload in web game'
        elif not ext:
            e['kind']='os_metadata'; e['suggested_use']='Exclude from build'
        else:
            e['kind']='image_candidate'; e['suggested_use']='See Asset_Usage_Guide and Visual_Catalog'
        if 'Sheet' in p.name or 'Spritesheets' in rel or e['category'] in ('Effects','Enemies','Hud'):
            e['sheet_candidate']=True
            e['frame_geometry']='unknown; do not infer from divisibility alone'
        entries.append(e)
    return entries

def enrich(entries):
    uses={
        'Acessories':('pixel-art icons','Mochila / equipment slots'),
        'Equipments':('pixel-art icons','Mochila / Loja / equipment details'),
        'Materials':('pixel-art icons','Resource counters, costs, rewards'),
        'Mine':('pixel-art ore nodes','Mina for iron; Produção for coal/gold/jade'),
        'Character':('pixel-art lateral protagonist','Batalha'),
        'Enemies':('mixed pixel-art actors and modular layers','Batalha; select compatible family'),
        'Boss':('mixed cartoon vector-derived and detailed raster actors','Batalha; select Left/Right where available'),
        'Hud':('ornate pixel-art UI','Persistent HUD and menus'),
        'Backgrounds':('layered pixel-art environments','Batalha scenery'),
        'Assets':('pixel-art decoration','Scenery, after atlas mapping'),
        'Tiles':('pixel-art floor/vegetation atlases','Mina/Batalha ground after crop mapping'),
        'Effects':('pixel-art VFX','Combat/mining feedback after sequence mapping'),
        'Misc':('pixel-art item icons','Mochila, Loja, buffs and navigation')}
    for e in entries:
        family,use=uses[e['category']]
        e['art_family']=family
        e['screen_usage']=use
        e['visual_description']='Category-level classification only; see curated Visual_Catalog; individual semantic identity not certified'
        e['recommended_scale']='integer nearest-neighbor for pixel art; mobile composition test required; no universal scale for bosses'
        e['limitations']='License unverified; pivot/crop/animation mapping requires validation where applicable'
        e['directions_from_filename']=[d for d in ('Left','Right','Front','Back') if d in e['path']]
        if e['kind']=='animation_frame':
            e['animation_group']=str(Path(e['path']).parent)
            m=re.search(r'(\d+)$',Path(e['path']).stem)
            if m: e['sequence_index']=int(m.group(1))
        e['candidate_frame_width']=None
        e['candidate_frame_height']=None
        e['estimated_sheet_frames']=None
        e['pivot_status']='unmapped'
    hero={'Idle':(64,80,4),'Attack-01':(96,80,8),'Run':(80,80,8),'Dead':(80,64,8),'Jump-End':(64,64,3)}
    for e in entries:
        if e['category']=='Character' and e['extension']=='.png':
            action=Path(e['path']).parts[2]
            if action in hero:
                w,h,n=hero[action]
                e.update(candidate_frame_width=w,candidate_frame_height=h,estimated_sheet_frames=n,
                         animation_status='geometry corroborated by corresponding GIF; pivot/playback integration still pending')
    return entries

def contacts(entries):
    PREV.mkdir(parents=True,exist_ok=True)
    selected=defaultdict(list)
    # All UI/icons/environments, every protagonist PNG, representative sheet per enemy/boss.
    full={'Acessories','Assets','Backgrounds','Character','Equipments','Hud','Materials','Mine','Misc','Tiles','Effects'}
    for e in entries:
        if e['extension']!='.png': continue
        cat=e['category']; parts=Path(e['path']).parts
        if cat in full:
            selected[cat].append(e)
        elif cat=='Enemies':
            group='/'.join(parts[:3])
            if len([x for x in selected[cat] if x['path'].startswith(group+'/')])<2:
                selected[cat].append(e)
        elif cat=='Boss':
            if '/Spritesheets/Left - Idle.png' in e['path'] or (len(parts)==5 and parts[3]=='01_Idle' and e['path'].endswith('000.png')) or (len(parts)==4 and parts[2].startswith('Troll') and e['path'].endswith('Idle_000.png')):
                selected[cat].append(e)
    # Extra base skin samples: not merely hair/gloves from alphabetical traversal.
    for e in entries:
        if '/Male Skin/' in e['path'] or '/Female Skin/' in e['path']:
            if e['path'].endswith('Skin1.png'): selected['Enemies'].append(e)
    previews=[]
    font=ImageFont.load_default()
    for cat,items in sorted(selected.items()):
        for page in range(0,len(items),40):
            batch=items[page:page+40]; cols=4; cw,ch=300,178
            canvas=Image.new('RGB',(cols*cw,((len(batch)+cols-1)//cols)*ch),(32,36,45))
            d=ImageDraw.Draw(canvas)
            for n,e in enumerate(batch):
                x=(n%cols)*cw;y=(n//cols)*ch
                with Image.open(ROOT/e['path']) as src:
                    src=src.convert('RGBA')
                    if max(src.size)<=48:
                        src=src.resize((src.width*3,src.height*3),Image.Resampling.NEAREST)
                    src.thumbnail((286,128),Image.Resampling.NEAREST)
                    canvas.paste(src,(x+(cw-src.width)//2,y+4),src)
                label=e['path'][8:]
                for row in range(3): d.text((x+5,y+134+12*row),label[row*46:(row+1)*46],font=font,fill='white')
                e['visual_status']='included in representative contact sheet; frame mapping not approved'
            name=f'{cat}_{page//40+1:02}.jpg'
            canvas.save(PREV/name,quality=88)
            previews.append(dict(category=cat,path='art/previews/'+name,assets=[e['path'] for e in batch]))
    return previews

def main():
    entries=enrich(inspect()); previews=contacts(entries)
    groups=defaultdict(list)
    for e in entries: groups[e['sha256']].append(e['path'])
    dup=[v for v in groups.values() if len(v)>1]
    data=dict(schema_version=1, source_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),
              scope='Every git-tracked file under sprites/; technical scan plus representative visual sheets',
              files=len(entries), total_bytes=sum(e['bytes'] for e in entries),
              duplicate_groups=dup, previews=previews, assets=entries)
    datapages=OUT/'art/data'
    datapages.mkdir(parents=True,exist_ok=True)
    data['asset_pages']=[]
    for start in range(0,len(entries),300):
        name=f'assets_{start//300+1:03}.json'
        (datapages/name).write_text(json.dumps({'assets':entries[start:start+300]},ensure_ascii=False,indent=2)+'\n')
        data['asset_pages'].append({'path':'data/'+name,'files':len(entries[start:start+300])})
    del data['assets']
    (OUT/'art/asset_inventory.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    rows=['# Asset Manifest — Projeto Akai','',
          'Inventário completo dos arquivos versionados em `sprites/`. Gerado por `python docs/tools/audit_assets.py` (Pillow).', '',
          f"Snapshot de origem: `{data['source_commit']}`. **{len(entries):,} arquivos**, **{data['total_bytes']:,} bytes**, **{len(dup)} grupos de duplicatas exatas por SHA-256**.", '',
          'O [índice JSON técnico](art/asset_inventory.json) referencia páginas `art/data/assets_*.json` com todos os registros. Elas contêm IDs estáveis por caminho, SHA-256 completo, Git blob SHA-1, dimensões, modo, transparência, bbox alfa, frames GIF e estado de inspeção. O ID permanece estável enquanto o caminho permanecer igual; o hash muda com os bytes.', '',
          '## Escopo e limites','',
          'Todos os arquivos foram lidos e hashados. PNG/GIF foram decodificados; PSD tem somente cabeçalho/composite lido. AI/EPS/SCML/Aseprite são fontes inventariadas, não aprovadas visualmente. As folhas de contato cobrem todas as imagens de UI, ícones, efeitos, cenários e protagonista, e amostras de inimigos/bosses; não equivalem à aprovação de cada frame. Geometria, pivôs e FPS ainda exigem mapeamento quando não explicitados no guia.', '',
          'Não foram encontrados documentos de licença no snapshot. **Todos os assets têm licença pendente**, inclusive derivados. Autoria/atribuição desconhecidas não significam dispensa de crédito. O repositório público não concede licença comercial dos packs.', '',
          'Estado do projeto: documentação + assets + referência visual; sem cliente, servidor, dependências ou testes de jogo. `sprites/Equipments/` é o caminho real, não `Equipment/`. `sprites/Hud/` também existe. `Acessories` e `Jumlp-All` são grafias reais que devem ser preservadas.', '',
          '## Resumo por família','', '| Família | Arquivos | Bytes | Formatos |','|---|---:|---:|---|']
    for cat in sorted(set(e['category'] for e in entries)):
        es=[e for e in entries if e['category']==cat]; counts=Counter(e['extension'] for e in es)
        rows.append(f"| {cat} | {len(es)} | {sum(e['bytes'] for e in es)} | {', '.join(f'{k}: {v}' for k,v in sorted(counts.items()))} |")
    rows+=['','## Duplicatas exatas','', 'Mesmos bytes não significam mesmo papel semântico. Não excluir originais: selecionar um asset canônico no registro de runtime. Lista integral dos grupos no JSON.', '',
           '## Inventário por arquivo','', 'O inventário integral está paginado abaixo para continuar legível no GitHub. Nenhum arquivo é omitido. Dimensões em pixels; hash completo e detalhes de transparência/GIF no JSON. Nomes numéricos não provam material, raridade ou tier.', '']
    pagedir=OUT/'art/inventory'
    pagedir.mkdir(parents=True,exist_ok=True)
    for cat in sorted(set(e['category'] for e in entries)):
        es=[e for e in entries if e['category']==cat]
        for start in range(0,len(es),200):
            batch=es[start:start+200];name=f'{cat}_{start//200+1:02}.md'
            page=[f'# {cat} — arquivos {start+1}–{start+len(batch)} de {len(es)}','',
                  '[Manifesto](../../Asset_Manifest.md) · [Dados completos](../asset_inventory.json)','',
                  'Dimensões em pixels. Tipo técnico não implica aprovação visual/licença. SHA-256 abreviado; íntegra no JSON.', '',
                  '| Caminho | Bytes | Dimensões / modo | Tipo | SHA-256 (12) |','|---|---:|---|---|---|']
            for e in batch:
                dim=f"{e['width']}×{e['height']} {e['mode']}" if 'width' in e else '—'
                page.append(f"| [{e['path']}](../../../{quote(e['path'],safe='/')}) | {e['bytes']} | {dim} | {e['kind']} | `{e['sha256'][:12]}` |")
            (pagedir/name).write_text('\n'.join(page)+'\n')
            rows.append(f'- [{cat}: {start+1}–{start+len(batch)}](art/inventory/{name})')
    (OUT/'Asset_Manifest.md').write_text('\n'.join(rows)+'\n')
    print(json.dumps({k:data[k] for k in ('files','total_bytes','source_commit')}))
    print('Duplicates:',len(dup),'Previews:',len(previews))
    print('Technical errors:',[e['path'] for e in entries if e['technical_status'].startswith('error')])

if __name__=='__main__': main()

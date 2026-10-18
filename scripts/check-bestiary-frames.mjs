// Decode our generated RGBA8 PNGs using only Node builtins, then check every used animation cell.
// Padding cells in the 8x4 atlas are intentionally ignored. No runtime dependency is added.
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
const ENEMY_TEMPLATES=JSON.parse(await readFile(new URL('./bestiary-spec.json',import.meta.url),'utf8'));
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
let checked=0;
for(const t of ENEMY_TEMPLATES){
 const b=await readFile(new URL(`../apps/client/src/assets/derived/bestiary-${t.id}.png`,import.meta.url));
 assert.equal(b.readUInt32BE(16),1280);assert.equal(b.readUInt32BE(20),512);assert.equal(b[24],8);assert.equal(b[25],6);assert.equal(b[28],0);
 const chunks=[];for(let at=8;at<b.length;){const len=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8);if(type==='IDAT')chunks.push(b.subarray(at+8,at+8+len));at+=len+12;}
 const raw=inflateSync(Buffer.concat(chunks)),stride=1280*4,pixels=Buffer.alloc(stride*512);
 for(let y=0;y<512;y++){
  const filter=raw[y*(stride+1)];assert.ok(filter<=4);
  for(let x=0;x<stride;x++){
   const left=x>=4?pixels[y*stride+x-4]:0,up=y?pixels[(y-1)*stride+x]:0,ul=x>=4&&y?pixels[(y-1)*stride+x-4]:0;
   const predictor=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,ul);
   pixels[y*stride+x]=(raw[y*(stride+1)+x+1]+predictor)&255;
  }
 }
 for(const [row,n] of [[0,4],[1,6],[2,8],[3,8]])for(let frame=0;frame<n;frame++){
  let visible=false;for(let y=row*128;y<(row+1)*128&&!visible;y++)for(let x=frame*160;x<(frame+1)*160;x++)if(pixels[y*stride+x*4+3]){visible=true;break;}
  assert.ok(visible,`${t.id}: transparent animation frame row${row}, frame${frame}`);checked++;
 }
}
console.log(`Bestiary animation integrity: ${checked} nonempty frames across ${ENEMY_TEMPLATES.length} atlases.`);

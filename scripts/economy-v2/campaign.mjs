import {readFile,writeFile,mkdir,rename,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {initialCampaign,campaignDay,snapshot} from './campaign-policy.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,v]=x.replace(/^--/,'').split('=');return [k,v??true];}));
const days=Number(args.days??120),out=resolve(args.out??'docs/plans/hunts-builds/campaign-v10/checkpoint.json');
if(!Number.isInteger(days)||days<1||days>365)throw Error('INVALID_DAYS');
const files=(await readdir('packages/shared/src')).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).sort().map(f=>'packages/shared/src/'+f).concat(['scripts/economy-v2/campaign-policy.mjs','scripts/economy-v2/campaign.mjs']);
const hash=createHash('sha256');for(const file of files)hash.update(file).update(await readFile(file));
const sourceHash=hash.digest('hex');
let c=args.resume?JSON.parse(await readFile(out,'utf8')):initialCampaign({seed:Number(args.seed??4213),schedule:args.schedule??'best',build:args.build??'swift'});
if(args.resume)assert.equal(c.provenance?.sourceHash,sourceHash,'CHECKPOINT_SOURCE_CHANGED');
else c.provenance={sourceHash,baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceIncludesUncommittedChanges:true,node:process.version};
await mkdir(resolve(out,'..'),{recursive:true});
while(c.day<days){const row=campaignDay(c);await writeFile(out+'.tmp',JSON.stringify(c)+'\n');await rename(out+'.tmp',out);console.log(JSON.stringify({seed:c.seed,schedule:c.schedule,build:c.build,...row,equipment:row.equipment.map(i=>`${i.definitionId}:${i.rarity}:${i.level}:+${i.enhancement}`)}));}
snapshot(c);

import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Database} from './database.js';
import {readEconomyConsumersV9} from './economy-consumers-v9.js';
import {EconomyRehearsalService} from './economy-rehearsal.js';
const args=process.argv.slice(2),operation=args[0],arg=(name:string)=>{const i=args.indexOf(name);if(i<0||!args[i+1]||args[i+1]!.startsWith('--'))throw Error('REQUIRED '+name);return args[i+1]!;};
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required; this tool only writes isolated rehearsals, never live balances');
const db=new Database(process.env.DATABASE_URL),service=new EconomyRehearsalService(db);
try{
 let result:unknown;
 if(operation==='stage'||operation==='stage-market-reconciled')result=await service.stage(arg('--account')!,args.includes('--request')?arg('--request')!:randomUUID(),operation==='stage-market-reconciled');
 else if(operation==='command'){const payload=JSON.parse(await readFile(arg('--file')!,'utf8'));result=await service.command(arg('--run')!,payload);}
 else if(operation==='consumers')result=await readEconomyConsumersV9(db,arg('--run')!);
 else if(operation==='report'){const row=await service.inspect(arg('--run')!);result={rehearsalOnly:true,revision:row.revision,closed:row.closed,highest:row.state.economy.highest,balances:row.state.economy.balances,ledgerMismatches:await service.reconcile(arg('--run')!)};}
 else if(operation==='rollback-export'){
  const archive=await service.rollbackArchive(arg('--run')!),file=resolve(arg('--out')!);await mkdir(dirname(file),{recursive:true,mode:0o700});await writeFile(file,JSON.stringify(archive,null,2)+'\n',{mode:0o600,flag:'wx'});result={file,exportOnly:true,liveAccountModified:false};
 }else throw Error('Use stage --account UUID [--request UUID], command --run UUID --file private-command.json, report --run UUID, consumers --run UUID, rollback-export --run UUID --out private-backup.json');
 console.log(JSON.stringify(result));
}finally{await db.close();}

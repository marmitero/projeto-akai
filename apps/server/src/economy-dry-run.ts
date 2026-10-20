import { mkdir,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { Database } from './database.js';
import { dryRunEconomyDatabase } from './economy-migration.js';
const args=process.argv.slice(2),outIndex=args.indexOf('--out'),limitIndex=args.indexOf('--limit'),atIndex=args.indexOf('--at');
if(!process.env.DATABASE_URL||outIndex<0||!args[outIndex+1])throw Error('DATABASE_URL and --out <private-backup.json> required; no account is modified');
const file=resolve(args[outIndex+1]!);
const db=new Database(process.env.DATABASE_URL);
try {
  const report=await dryRunEconomyDatabase(db,atIndex<0?Date.now():Number(args[atIndex+1]),limitIndex<0?100:Number(args[limitIndex+1]));
  await mkdir(dirname(file),{recursive:true,mode:0o700});
  await writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({readOnly:true,accounts:report.accountCount,blocked:report.blockedAccounts,file}));
}finally{await db.close();}

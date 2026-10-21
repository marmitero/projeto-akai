import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Database} from './database.js';
import {BossEventsV8Service} from './boss-events-v8.js';
const args=process.argv.slice(2),arg=(key:string)=>{const i=args.indexOf(key);if(i<0||!args[i+1]||args[i+1]!.startsWith('--'))throw Error('REQUIRED '+key);return args[i+1]!;};
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required; private rehearsals only');const db=new Database(process.env.DATABASE_URL),service=new BossEventsV8Service(db);
try{let result:unknown;if(args[0]==='stage')result=await service.stage(JSON.parse(await readFile(arg('--file'),'utf8')),args.includes('--request')?arg('--request'):randomUUID());else if(args[0]==='command')result=await service.command(arg('--realm'),arg('--actor'),JSON.parse(await readFile(arg('--file'),'utf8')));else if(args[0]==='report')result=await service.inspect(arg('--realm'));else throw Error('Use stage --file private-run-ids.json [--request UUID], command --realm UUID --actor RUN_UUID --file private-command.json, report --realm UUID');console.log(JSON.stringify(result));}finally{await db.close();}

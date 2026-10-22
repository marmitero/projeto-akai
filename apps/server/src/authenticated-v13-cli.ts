import {Database} from './database.js';
import {OnlineService} from './online.js';
import {AuthenticatedV13Service} from './authenticated-v13.js';
const args=process.argv.slice(2),arg=(name:string)=>{const at=args.indexOf(name);if(at<0||!args[at+1])throw Error('REQUIRED '+name);return args[at+1]!;};
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required; isolated test database only');
const db=new Database(process.env.DATABASE_URL),service=new AuthenticatedV13Service(new OnlineService(db));
try{
 if(args[0]==='bind-market')console.log(JSON.stringify(await service.bindMarket(arg('--realm'))));
 else if(args[0]==='bind')console.log(JSON.stringify(await service.bindWorld(arg('--realm'))));
 else if(args[0]==='disable'||args[0]==='enable'){await service.setEnabled(arg('--account'),args[0]==='enable');console.log(JSON.stringify({updated:true,rehearsalOnly:true}));}
 else throw Error('Use bind-market --realm UUID, bind --realm UUID, disable --account UUID, enable --account UUID');
}finally{await db.close();}

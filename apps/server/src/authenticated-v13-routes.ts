import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import type {OnlineService} from './online.js';
import {sessionToken} from './routes.js';
import {AuthenticatedV13Service} from './authenticated-v13.js';
export async function authenticatedV13Routes(app:FastifyInstance,online:OnlineService){
 const service=new AuthenticatedV13Service(online);
 app.get('/api/v1/test-v2/state',async req=>{z.object({}).strict().parse(req.query);return service.read(sessionToken(req));});
 for(const kind of ['events','economy','market','arena'] as const)app.post('/api/v1/test-v2/'+kind,async(req,reply)=>{
  z.object({}).strict().parse(req.query);const token=sessionToken(req);await online.authLimit('v13:'+token,60);
  const result=await service.command(token,req.body,kind);if(result.status==='rejected')reply.code(422);
  return {...result,commandId:(req.body as {commandId:string}).commandId};
 });
}

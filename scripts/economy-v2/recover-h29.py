#!/usr/bin/env python3
"""Recover frozen reference evidence, then finish H29. Never weakens old auditors.
The required backup hook receives a single JSON request on stdin and must return
{success:true}; it is external so no personal storage credentials enter git.
"""
import argparse,asyncio,gzip,hashlib,json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'docs/plans/hunts-builds/progression-cadence-v29/local'
EXPECTED_H26='ff510f7ead1d0a136ea53e09decbbe1b8dac09642f4e16c42c0d524a15fa3f91'

def load(path):return json.loads(Path(path).read_text())
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def key(c):return f"{c['schedule']}-{c['build']}-{c['seed']}-h{c['startHour']:02d}"
def plan():
 cases=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{CASES_V29}from'./scripts/economy-v2/progression-panel-v29.mjs';console.log(JSON.stringify(CASES_V29))"],cwd=ROOT))
 original=load(ROOT/'docs/plans/hunts-builds/campaign-v10/results.json')['rows'];inherited={(r['schedule'],r['build'],r['seed'])for r in original}
 jobs=[]
 def add(stage,c,mode,days,script,folder,legacy=False):
  name=(f"{c['schedule']}-{c['build']}-{c['seed']}"if legacy else key(c))+'-'+mode
  args=['node',script,'--mode='+mode,'--days='+str(days)]
  if legacy:args+=['--schedule='+c['schedule'],'--build='+c['build'],'--seed='+str(c['seed'])]
  else:args+=['--case='+key(c)]
  directory=ROOT/folder
  jobs.append({'id':stage+'/'+name,'stage':stage,'config':c,'mode':mode,'target':days,'args':args,'checkpoint':str(directory/(name+'.checkpoint.json')),'snapshot':str(directory/(name+'.json.gz')),'report':str(directory/(name+'.results.json')),'status':'queued','day':0})
 for c in cases:
  if (c['schedule'],c['build'],c['seed'])in inherited and c['startHour']==0:add('v22',c,'calendar',120,'scripts/economy-v2/progression-campaign-v22.mjs','docs/plans/hunts-builds/progression-bonus-v22/campaigns',True)
  else:
   for mode in ['zero','calendar']:add('v24',c,mode,120,'scripts/economy-v2/run-progression-panel-v24.mjs','docs/plans/hunts-builds/progression-panel-v24/local')
 for schedule in ['best','casual']:add('v22',{'schedule':schedule,'build':'swift','seed':4213,'startHour':0},'zero',8,'scripts/economy-v2/progression-campaign-v22.mjs','docs/plans/hunts-builds/progression-bonus-v22/campaigns',True)
 for c in cases:
  for mode in ['zero','calendar']:add('v26',c,mode,120,'scripts/economy-v2/run-progression-panel-v26.mjs','docs/plans/hunts-builds/progression-bonus-v26/local')
 for c in cases:
  for mode in ['zero','calendar']:
   name=key(c)+'-'+mode;directory=DATA/name
   jobs.append({'id':'v29/'+name,'stage':'v29','config':c,'mode':mode,'target':120,'args':['node','scripts/economy-v2/run-progression-cadence-v29.mjs','--case='+key(c),'--mode='+mode,'--days=120'],'checkpoint':str(directory/'checkpoint.json'),'snapshot':str(directory/'snapshot.json.gz'),'report':str(directory/'results.json'),'status':'queued','day':0})
 return jobs

def assert_original_summary(value):
 actual=hashlib.sha256(json.dumps(value,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
 # Use Node JSON.stringify for the canonical JS representation, including number formatting.
 actual=subprocess.check_output(['node','--input-type=module','-e',"import{createHash}from'node:crypto';let s='';for await(const c of process.stdin)s+=c;console.log(createHash('sha256').update(JSON.stringify(JSON.parse(s))).digest('hex'));"],input=json.dumps(value).encode(),cwd=ROOT).decode().strip()
 if actual!=EXPECTED_H26:raise RuntimeError('ORIGINAL_H26_SUMMARY_HASH_MISMATCH: '+actual)
 return actual

class Recovery:
 def __init__(self,args):
  self.args=args;self.path=DATA/'recovery-state.json';self.jobs=plan();self.processes={};self.error=None;self.backup_lock=asyncio.Lock();self.state={'version':'h29-recovery-1','phase':'restoring-references','frozenModelCommit':'e2c857d7579a9b5a1d0df3bdf2e46492e3c14053','expectedH26SummaryHash':EXPECTED_H26,'jobs':self.jobs};self.last_backup=0
 def save(self):
  self.state['updatedAtEpoch']=time.time();p=self.path.with_suffix('.tmp');p.write_text(json.dumps(self.state,indent=2)+'\n');p.replace(self.path)
 async def backup(self,reason):
  async with self.backup_lock:
   if self.state.get('backupError'):raise RuntimeError('PRIVATE_BACKUP_OUTCOME_REQUIRES_REVIEW')
   self.save();request={'root':str(ROOT),'reason':reason,'phase':self.state['phase'],'stateFile':str(self.path)}
   p=await asyncio.create_subprocess_exec(sys.executable,self.args.backup_hook,stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
   out,err=await p.communicate((json.dumps(request)+'\n').encode());result=json.loads(out)
   if p.returncode or result.get('success')is not True:raise RuntimeError('PRIVATE_BACKUP_FAILED_OR_UNCERTAIN')
   self.last_backup=time.time();self.state['lastDurableBackup']={k:result[k]for k in ['library_file_id','current_version_number','archiveHash','fileCount']if k in result};self.save();print(json.dumps({'backupSaved':True,'reason':reason,'phase':self.state['phase']}),flush=True)
 async def periodic_backup(self):
  while True:
   await asyncio.sleep(30)
   if time.time()-self.last_backup>=600:
    try:await self.backup('periodic-checkpoint')
    except Exception as e:
     self.error=str(e);self.state['backupError']=str(e);self.save()
     for p in list(self.processes.values()):
      if p.returncode is None:p.send_signal(2)
     return
 def finished_file(self,j):
  try:
   r=load(j['report']);raw=gzip.decompress(Path(j['snapshot']).read_bytes());p=json.loads(raw)
   if r['days']!=j['target']or r.get('integrityPassed')is not True:return False
   if r.get('snapshotHash',r.get('checkpointSha256'))!=hashlib.sha256(raw).hexdigest():return False
   c=p.get('campaign',p)
   if c['day']!=j['target']or c['seed']!=j['config']['seed']or c['schedule']!=j['config']['schedule']or c['build']!=j['config']['build']:return False
   if j['stage']=='v29':
    if not r.get('complete'):return False
    directory=Path(j['report']).parent
    for day in p['cadence']['days']:
     f=directory/f"day-{day['day']:03d}.json.gz"
     if digest(f)!=day['archiveHash']:return False
   return True
  except (OSError,ValueError,KeyError,TypeError):return False
 def resume(self,j):
  try:
   p=load(j['checkpoint']);c=p.get('campaign',p)
   if not 0<c['day']<=j['target']:return False
   if j['stage']=='v29':
    for d in p['cadence']['days']:
     f=Path(j['checkpoint']).parent/f"day-{d['day']:03d}.json.gz"
     if digest(f)!=d['archiveHash']:return False
   j['day']=c['day'];return True
  except (OSError,ValueError,KeyError,TypeError):return False
 async def job(self,j,sem):
  async with sem:
   if self.error:return
   if self.finished_file(j):j.update(status='runner-complete',day=j['target'],recoveredExisting=True);self.save();return
   args=j['args']+(['--resume=true']if self.resume(j)else[])
   j.update(status='running',startedAtEpoch=time.time());self.save();log=DATA/'recovery-logs'/(j['id'].replace('/','-')+'.log');log.parent.mkdir(exist_ok=True)
   p=await asyncio.create_subprocess_exec(*args,cwd=ROOT,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT);self.processes[j['id']]=p;j['pid']=p.pid;self.save()
   with log.open('wb')as f:
    async for line in p.stdout:
     f.write(line);f.flush()
     try:
      row=json.loads(line)
      if 'day'in row:j['day']=row['day'];self.save()
     except (ValueError,TypeError):pass
   code=await p.wait();self.processes.pop(j['id'],None);j['returncode']=code;j['finishedAtEpoch']=time.time()
   if code==0 and self.finished_file(j):j.update(status='runner-complete',day=j['target'])
   else:j['status']='failed';self.error=self.error or 'CAMPAIGN_PROCESS_FAILED: '+j['id']
   self.save();print(json.dumps({'finished':j['id'],'status':j['status'],'day':j['day']}),flush=True)
 async def phase(self,name,stages):
  self.state['phase']=name;self.save();sem=asyncio.Semaphore(self.args.concurrency);await asyncio.gather(*(self.job(j,sem)for j in self.jobs if j['stage']in stages))
  if self.error:raise RuntimeError(self.error)
  await self.backup('phase-runners-complete')
 async def command(self,args,name):
  with (DATA/name).open('wb')as f:
   p=await asyncio.create_subprocess_exec(*args,cwd=ROOT,stdout=f,stderr=asyncio.subprocess.STDOUT);code=await p.wait()
  if code:raise RuntimeError('VALIDATION_FAILED: '+name)
 async def run(self):
  DATA.mkdir(parents=True,exist_ok=True);self.state['sourcesByHour']=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{sourcesV29}from'./scripts/economy-v2/progression-sources-v29.mjs';const r={};for(const h of [0,12,20])r[h]=await sourcesV29(h);console.log(JSON.stringify(r));"],cwd=ROOT))
  if self.path.exists():
   old=load(self.path)
   if old.get('sourcesByHour')!=self.state['sourcesByHour']:raise RuntimeError('RECOVERY_SOURCE_CHANGED')
  self.save();await self.backup('before-reference-recovery');periodic=asyncio.create_task(self.periodic_backup())
  try:
   await self.phase('restoring-v22-v24',{'v22','v24'})
   self.state['phase']='auditing-restored-v22-v24';self.save()
   await self.command(['node','scripts/economy-v2/audit-progression-campaign-v22.mjs'],'recovery-audit-v22.log')
   await self.command(['node','scripts/economy-v2/audit-progression-panel-v24.mjs'],'recovery-audit-v24.log')
   await self.backup('v22-v24-audited')
   await self.phase('restoring-v26',{'v26'})
   self.state['phase']='auditing-original-v26-hash';self.save();await self.command(['node','scripts/economy-v2/audit-progression-panel-v26.mjs'],'recovery-audit-v26.log')
   value=load(ROOT/'docs/plans/hunts-builds/progression-bonus-v26/local/summary.json');self.state['restoredH26Hash']=assert_original_summary(value);await self.backup('original-reference-hash-confirmed')
   await self.phase('running-h29-28-arms',{'v29'})
   self.state['phase']='two-h29-ledger-audits';self.save();independent=DATA/'independent-audit.mjs';independent.write_text("import{auditCadenceV29}from "+json.dumps((ROOT/'scripts/economy-v2/audit-progression-cadence-v29.mjs').as_uri())+";import{writeFile}from'node:fs/promises';await writeFile("+json.dumps(str(DATA/'independent-summary.json'))+",JSON.stringify(await auditCadenceV29(undefined,4),null,2)+'\\n');\n")
   await asyncio.gather(self.command(['node','scripts/economy-v2/audit-progression-cadence-v29.mjs'],'h29-audit-primary.log'),self.command(['node',str(independent)],'h29-audit-independent.log'))
   a=(DATA/'summary.json').read_bytes();b=(DATA/'independent-summary.json').read_bytes()
   if a!=b:raise RuntimeError('H29_RECOMPUTATION_MISMATCH')
   self.state['summaryHash']=hashlib.sha256(a).hexdigest();self.state['phase']='h29-private-adulteration-tests';self.save();await self.command(['node','--test','scripts/tests/progression-cadence-v29.local-check.mjs'],'h29-private-tests.log')
   self.state['phase']='complete';self.state['integrityPassed']=True;self.save();await self.backup('all-validation-complete');print(json.dumps({'complete':True,'summaryHash':self.state['summaryHash']}),flush=True)
  except Exception as e:self.state['phase']='blocked';self.state['error']=str(e);self.save();raise
  finally:periodic.cancel();await asyncio.gather(periodic,return_exceptions=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--plan',action='store_true');parser.add_argument('--concurrency',type=int,default=8);parser.add_argument('--backup-hook');args=parser.parse_args();os.chdir(ROOT)
 if not 1<=args.concurrency<=8:parser.error('concurrency must be between1and8')
 if args.plan:print(json.dumps({'expectedH26SummaryHash':EXPECTED_H26,'jobs':plan()}));sys.exit(0)
 if not args.backup_hook or not Path(args.backup_hook).is_file():parser.error('an existing private backup hook is required')
 asyncio.run(Recovery(args).run())

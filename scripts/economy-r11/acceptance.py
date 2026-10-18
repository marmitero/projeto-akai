"""Frozen-gate acceptance; output all accounts, including non-progressors."""
import json,hashlib,time
from pathlib import Path
import calibrate as c
m=c.m

def summary(r):
 rows=r['rows'];n=len(rows)
 def events(metric):return sorted(a['metrics'][metric] for a in rows if metric in a['metrics'])
 dates=events('level1000Day');by120=sum(x<=120 for x in dates);twenty=sum('first20Day' in a['metrics'] for a in rows)
 def q(p):
  # Full-cohort quantile, including right-censored accounts at infinity.
  v=dates+[None]*(n-len(dates));return v[min(n-1,int((n-1)*p))]
 return dict(n=n,days=r['days'],active=r['active'],offline=r['offline'],paid=r['paid'],seed=r['seed'],mature=r['mature'],maxLevelReached=len(dates),maxLevelBy120Fraction=by120/n,maxLevelDays=dict(min=min(dates) if dates else None,p50=q(.5),p90=q(.9),p95=q(.95),max=max(dates) if dates else None),main100By30=sum(a['metrics'].get('main100Day',9999)<=30 for a in rows)/n,basicHuntsBy30=sum(a['metrics'].get('allBasicHuntsDay',9999)<=30 for a in rows)/n,any20=twenty/n,any20Wilson95=m.wilson(twenty,n),finalLevelMedian=sorted(a['level'] for a in rows)[n//2],finalMainMedian=sorted(a['main'] for a in rows)[n//2],advancedHunt=sum('advancedHuntDay' in a['metrics'] for a in rows)/n)

def ablation():
 rows=[]
 for build in m.BUILDS:
  for rarity,enh in ((0,0),(2,0),(2,7),(3,12),(4,15)):
   a=c.Account(0,1,0,0,build);a.xp=c.THRESHOLDS[-1];a.train=m.initial_build(1000,build)
   for slot,name in dict(weapon='sword',shield='shield',chest='armor',head='hat',hands='gloves',feet='boots',neck='pendant',ring1='ring',ring2='ring').items():
    item=a.item(name,rarity,100,1.);item.enhancement=enh;a.gear[slot]=item
   encounters={}
   for kind,f in [('main',999),('coal',750),('iron',750),('gold',750),('gold',1000)]:
    e=c.encounter(a.stats(),kind,f);encounters[kind+str(f)]=dict(safe=e['safe'],seconds=e['seconds'],incomingHpFraction=e['damage']/a.stats()['hp'])
   rows.append(dict(build=build,rarity=rarity,refine=enh,encounters=encounters))
 return rows

def bootstrap():
 rows=[]
 for build in m.BUILDS:
  for starter in (True,False):
   a=c.Account(0,1001,6,0,build,no_drops=True)
   if not starter:a.gear={}
   m.run_account(a,1,dict(variant='r11',weekly_scrolls=0,jade_daily=0));rows.append(dict(build=build,starter=starter,metrics=a.metrics,level=c.hero_level(a.xp),main=a.highest))
 return rows

if __name__=='__main__':
 start=time.monotonic();c.OUT.mkdir(parents=True,exist_ok=True)
 criteria=json.loads((c.OUT/'criteria.json').read_text());profiles={};summaries={}
 # Fresh acceptance seeds, deliberately distinct from all tuning pilots.
 plans=[('best_24h',dict(n=24,days=150,active=24,offline=0,build='swift',seed=88452001)),('optimized_16plus8',dict(n=24,days=160,active=16,offline=8,build='swift',seed=88452001)),('paid_best_24h',dict(n=24,days=150,active=24,offline=0,build='swift',paid=10,seed=88452001)),('regular_2plus8',dict(n=24,days=365,active=2,offline=8,seed=88452001)),('dedicated_8plus8',dict(n=24,days=250,active=8,offline=8,seed=88452001)),('best_holdout',dict(n=24,days=150,active=24,offline=0,build='swift',seed=99337001)),('mature_free',dict(n=300,days=90,active=2,offline=8,mature=True,seed=88452001)),('mature_paid',dict(n=300,days=90,active=2,offline=8,mature=True,paid=10,seed=88452001))]
 for name,kw in plans:
  r=c.simulate(**kw,quiet=True);profiles[name]=r;summaries[name]=summary(r)
  (c.OUT/'cohorts.json').write_text(json.dumps(profiles,indent=2)+'\n');(c.OUT/'summaries.json').write_text(json.dumps(summaries,indent=2)+'\n')
  print(name,json.dumps(summaries[name]),flush=True)
 a=ablation();b=bootstrap();free=summaries['mature_free'];paid=summaries['mature_paid'];best=summaries['best_24h'];hold=summaries['best_holdout']
 low=[x for x in a if x['rarity'] in (0,2) and x['refine']==0];strong=[x for x in a if x['refine'] in (12,15)]
 gates=dict(absoluteMinimum=c.THRESHOLDS[-1]/86400>=90,bestMedian=best['maxLevelDays']['p50'] is not None and 90<=best['maxLevelDays']['p50']<=120,bestBy120=best['maxLevelBy120Fraction']>=.9,holdoutMedian=hold['maxLevelDays']['p50'] is not None and 90<=hold['maxLevelDays']['p50']<=120,holdoutBy120=hold['maxLevelBy120Fraction']>=.9,bootstrap=all(all(x['metrics'].get('first'+k+'ActiveHours',9999)<=6 for k in ('Coal','Iron')) for x in b),gearAblation=all(not x['encounters']['main999']['safe'] and not x['encounters']['gold1000']['safe'] for x in low) and any(x['encounters']['main999']['safe'] and x['encounters']['gold1000']['safe'] for x in strong),matureScarcity=free['n']>=300 and .01<=free['any20']<=.03,paidGap=paid['any20']-free['any20']<=.1,completeness=False)
 result=dict(version=c.CONFIG['version'],criteria=criteria,config=c.CONFIG,absoluteMinimumDays=c.THRESHOLDS[-1]/86400,summaries=summaries,ablation=a,bootstrap=b,gates=gates,numericalApproval=all(v for k,v in gates.items() if k!='completeness'),implementationApproved=all(gates.values()),unresolved=['Future jade boss participation/rewards','Ruby price/funding, all-source free supply, alt funnel','Human market liquidity/gear access','Legacy compensation/overflow/crafting/pets/affixes/migration'],elapsedSeconds=round(time.monotonic()-start,2),hashes={str(p.relative_to(c.ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (Path(c.__file__),c.ROOT/'scripts/economy-r1/model.py',c.OUT/'criteria.json',c.ROOT/'docs/plans/hunts-builds/r1/content-baseline.json')})
 (c.OUT/'results.json').write_text(json.dumps(result,indent=2)+'\n');print('GATES',json.dumps(gates),flush=True)

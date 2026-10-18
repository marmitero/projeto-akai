"""Exact protected birth-death means and independent finite-scroll checks."""
import json
import calibrate as c
step=scroll=0.;coststep=dict.fromkeys(c.m.KEYS,0.);totcost=dict.fromkeys(c.m.KEYS,0.);tots=totn=0.;rows=[]
for n,p in enumerate(c.m.CURVE['probabilities'],1):
 back=1-p if n>3 else 0;step=(1+back*step)/p;scroll=((1 if n>=8 else 0)+back*scroll)/p;totn+=step;tots+=scroll
 bill=c.enhancement_cost(n,100,4)
 for k in c.m.KEYS:coststep[k]=(bill[k]+back*coststep[k])/p;totcost[k]+=coststep[k]
 if n in (3,7,12,15,20):rows.append(dict(target=n,meanAttempts=totn,meanScrolls=tots,meanCosts=dict(totcost)))
state=[1.]+[0.]*20;quantiles={};expected=sum(v for v in [0.])
for attempts in range(1,250001):
 nxt=[0.]*20+[state[20]]
 for lv in range(20):
  p=c.m.CURVE['probabilities'][lv];mass=state[lv];nxt[lv+1]+=mass*p;nxt[lv if lv<3 else lv-1]+=mass*(1-p)
 state=nxt
 for p in (.5,.95,.99):
  if str(p) not in quantiles and state[20]>=p:quantiles[str(p)]=attempts
 if len(quantiles)==3:break
report=dict(method='Exact birth-death protected from destination8; unlimited funds and intact legendaryL100 base; excludes farming/acquisition',rows=rows,attemptQuantilesTo20=quantiles,scrollBudgetChecks=[c.m.protection_stress(n=20000,seed=48715501,scroll_budget=b) for b in (390,520,1000)])
(c.OUT/'refinement-expectations.json').write_text(json.dumps(report,indent=2)+'\n');print(quantiles,flush=True)

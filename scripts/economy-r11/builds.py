"""Equal-point/equal-gear build diagnostic; separate from pacing acceptance."""
import json
import calibrate as c
wins=dict.fromkeys(c.m.BUILDS,0);rows=[]
for L in (100,250,500,750,1000):
 for kind,f in [('main',min(999,L-(L%10==0))),('coal',max(1,int(L*.7))),('iron',max(1,int(L*.7))),('gold',max(1,int(L*.7)))]:
  scores={}
  for build in c.m.BUILDS:
   x=c.Account(0,1,0,0,build);x.xp=c.THRESHOLDS[L-1];x.train=c.m.initial_build(L,build)
   for slot,name in dict(weapon='sword',shield='shield',chest='armor',head='hat',hands='gloves',feet='boots',neck='pendant',ring1='ring',ring2='ring').items():
    i=x.item(name,3,c.item_level(L),1.);i.enhancement=12;x.gear[slot]=i
   e=c.encounter(x.stats(),kind,f);scores[build]=dict(safe=e['safe'],killsPerHour=3600*e['kills']/e['seconds'] if e['safe'] else 0,incomingHpFraction=e['damage']/x.stats()['hp'])
  viable=[b for b in scores if scores[b]['safe']];winner=max(viable,key=lambda b:scores[b]['killsPerHour']) if viable else None
  if winner:wins[winner]+=1
  rows.append(dict(level=L,kind=kind,floor=f,winner=winner,builds=scores))
report=dict(method='Equal weighted points and identical epic+12 gear per hero level; no acquisition claim',wins=wins,distinctWinners=sum(v>0 for v in wins.values()),largestWinnerShare=max(wins.values())/sum(wins.values()),cases=rows)
(c.OUT/'build-diversity.json').write_text(json.dumps(report,indent=2)+'\n');print(wins,report['largestWinnerShare'])

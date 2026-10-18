"""Retain original R1 numeric diagnostics against current cohort output."""
import json
import calibrate as c
r=json.loads((c.OUT/'cohorts.json').read_text());b=json.loads((c.OUT/'build-diversity.json').read_text());a=r['regular_2plus8']['rows'];n=len(a)
elig=sum(x['metrics'].get('eligibleDay',9999)<=90 for x in a);legend=sum(x['metrics'].get('firstLegendaryDay',9999)<=90 for x in a if x['metrics'].get('eligibleDay',9999)<=90)
g=dict(regularMain100By30=sum(x['metrics'].get('main100Day',9999)<=30 for x in a)/n>=.9,basicHuntsBy30=sum(x['metrics'].get('allBasicHuntsDay',9999)<=30 for x in a)/n>=.9,renewableLegendary=elig/n>=.8 and (legend/elig if elig else 0)>=.8,buildDiversity=b['distinctWinners']>=2 and b['largestWinnerShare']<=.8,paidFloorProgressionRatio=sorted(x['main'] for x in r['paid_best_24h']['rows'])[len(r['paid_best_24h']['rows'])//2]/max(1,sorted(x['main'] for x in r['best_24h']['rows'])[len(r['best_24h']['rows'])//2])<=1.5)
(c.OUT/'legacy-gates.json').write_text(json.dumps(dict(gates=g,eligibleBy90=elig/n,legendaryGivenEligibleBy90=legend/elig if elig else 0,buildWins=b['wins'],largestBuildWinnerShare=b['largestWinnerShare'],note='Original R1 numeric diagnostics retained; changed user pacing goal supersedes earlier XP timeline; completeness still blocked'),indent=2)+'\n')
print(g)

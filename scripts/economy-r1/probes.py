"""Supplementary diagnostics, not substitute acceptance cohorts."""
import json
import model as m
rows=[]
for build in m.BUILDS:
 for sword in (True,False):
  a=m.Account(0,1001,6,0,build,no_drops=True)
  if not sword:a.gear={}
  m.run_account(a,1,dict(variant='v1',jade_daily=0,weekly_scrolls=0))
  rows.append(dict(build=build,starterSword=sword,hunts=a.hunts,main=a.highest,metrics=a.metrics))
(m.DATA/'bootstrap-builds.json').write_text(json.dumps(rows,indent=2)+'\n')
rows=[]
for days in (1,3,7,30):
 accounts=[m.run_account(m.Account(i,20261018+i*1009,2,8,list(m.BUILDS)[i%6]),days,dict(variant='v1',jade_daily=3,attendance=.85)) for i in range(24)]
 rows.append(m.summarize(accounts,days))
 print('snapshot',days,flush=True)
report=dict(progression=rows,protectionBudgetSensitivity=[m.protection_stress(n=20000,seed=69002,scroll_budget=x) for x in (10,20,30,40,60,90)],note='Finite scroll budget with unlimited other resources is a ceiling, never an approved new supply rule.')
(m.DATA/'probes.json').write_text(json.dumps(report,indent=2)+'\n')

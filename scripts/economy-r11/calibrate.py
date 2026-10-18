"""R1.1 candidate, independent of runtime. Reuses frozen R1 for economy invariants.
XP unit is a qualifying combat-second (mastery), NOT old persisted heroXp.
"""
from __future__ import annotations
import sys,json,math,random,bisect,copy,hashlib,argparse,time
from functools import lru_cache
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/economy-r1'))
import model as m
OUT=ROOT/'docs/plans/hunts-builds/r11'
ORIGINAL_ENCOUNTER=m.encounter
ORIGINAL_COST=m.enhancement_cost
ORIGINAL_RUN=m.run_account
ORIGINAL_BASE=copy.deepcopy(m.BASE)
# Fixed before acceptance cohorts: maximum mastery generation 1 second/second.
# 96*24 effective hours is an absolute bound, even all hits/crit/loot favorable.
CONFIG=dict(version='r11-candidate-2',maxLevel=1000,minimumQualifyingCombatHours=2304,offlineHours=8,
 xpBandWeight=dict(base=.05,scale=2,power=1.7),commonHpRamp=2,commonAttackRamp=25,
 huntHpRamp=1,huntAttackRamp=4,huntEnrageSeconds=30,weeklyScrolls=30,paidWeeklyScrolls=10,
 protectedHighSuccess=[.32,.27,.22,.17,.12],materialExponent=.65,jadeDailyScenario=3,
 coinRewardLateRamp=.25,gearEquipHeroLevelsPerItemLevel=10,lateRecipeMultipliers=dict(coin=4,coal=4,iron=8,gold=4,jade=1),
 xpReference='min(completed encounter cycle seconds, benchmark cycle seconds) * challenge eligibility',
 benchmarkEnhancement=10,benchmark='Epic +10 at stage item level; swift equal-point build, no pets/buffs; legal stats')

@lru_cache(maxsize=200000)
def cached_item_score(definition,L,rarity,q,enh):
 d=m.BASE['items'][definition];v=L*L*m.STAT_RARITY[rarity]*q*m.gain(enh)
 return v*(d['attack']+d['hp']/6+d['defense']*.2/L)
@lru_cache(maxsize=200000)
def cached_item_stats(definition,L,rarity,q,enh):
 d=m.BASE['items'][definition];v=L*L*m.STAT_RARITY[rarity]*q
 return (d['attack']*v*m.gain(enh),d['hp']*v*m.gain(enh),d['defense']*L*m.STAT_RARITY[rarity]*m.gain(enh))
def item_score(i):return cached_item_score(i.definition,i.level,i.rarity,i.quality,i.enhancement)
def item_stats(i):return cached_item_stats(i.definition,i.level,i.rarity,i.quality,i.enhancement)

def configure(hours=2304):
 global THRESHOLDS
 if 'BENCH' in globals():BENCH.clear();benchmark_stats.cache_clear()
 weights=[.05+2*(n/999)**1.7 for n in range(1,1000)];scale=hours*3600/sum(weights);THRESHOLDS=[0.]
 for w in weights:THRESHOLDS.append(THRESHOLDS[-1]+w*scale)
 THRESHOLDS[-1]=hours*3600
 m.CURVE['probabilities'][15:]=CONFIG['protectedHighSuccess']
 m.level=hero_level
 m.Item.score=item_score;m.Item.stats=item_stats
 m.run_account=run_account
 m.enhancement_cost=enhancement_cost
 m.Account=Account;m.farm=farm;m.encounter=encounter;m.choose=choose;m.advance_block=advance_block
 m.BASE=copy.deepcopy(ORIGINAL_BASE)
 for i,groups in enumerate(m.BASE['encounters']):
  if (i+1)%10==0:continue # No edits to published tower boss definitions.
  t=max(0,(i+1-100)/900)
  for group in groups:
   for e in group:
    e[0]=math.ceil(e[0]*(1+CONFIG['commonHpRamp']*t*t));e[1]=math.ceil(e[1]*(1+CONFIG['commonAttackRamp']*t**3))

def run_account(a,days,config):
 if a.active_hours<0 or not 0<=a.offline_hours<=8 or a.active_hours+a.offline_hours>24:raise ValueError('One account cannot produce more than24h/day or8h/offline')
 result=ORIGINAL_RUN(a,days,config)
 assert a.clock<=days*86400+.01
 assert a.mastery_earned<=a.clock+.01
 return result

def enhancement_cost(n,L,rarity):
 costs=ORIGINAL_COST(n,L,rarity)
 return {k:v*(CONFIG['lateRecipeMultipliers'][k] if n>=11 else 1) for k,v in costs.items()}

def hero_level(xp):return min(1000,bisect.bisect_right(THRESHOLDS,max(0,xp)))
def item_level(L):return min(100,1+(L-1)//10)

OriginalAccount=m.Account
class Account(OriginalAccount):
 def __post_init__(self):
  super().__post_init__()
  if self.mature:self.xp=THRESHOLDS[-1]
  self.benchmark_cache={};self.unclaimed=[];self.mastery_earned=0.;self.mastery_discarded=0.
  self.blocked_equipment=0;self.purchased_refine=0;self.last_item_stage=item_level(hero_level(self.xp))
 def receive(self,item):
  if (item.level-1)*10+1>hero_level(self.xp):
   self.unclaimed.append(item)
   if len(self.unclaimed)>100:self.unclaimed.sort(key=lambda x:(x.rarity==4,x.score()),reverse=True);self.unclaimed=self.unclaimed[:100]
   return
  # Keep useful enhanced base: avoid replacing +12 with an unenhanced 2% score increase.
  old=self.gear.get(m.BASE['items'][item.definition]['slot'])
  if old and old.enhancement>=8 and item.score()<old.score()*1.15:self.stash.append(item);return
  super().receive(item)
 def collect_offline_items(self):
  stage=item_level(hero_level(self.xp))
  if stage!=self.last_item_stage:
   items=self.unclaimed;self.unclaimed=[]
   for item in items:self.receive(item)
   self.last_item_stage=stage
  super().collect_offline_items()
 def stats(self):
  result=super().stats();result['level']=hero_level(self.xp);return result
 def refine_target(self):
  items=list(self.gear.items())
  # First bring every current equipped piece to +7; then weapon +15, armor +12.
  def target(slot,i):
   if i.level<max(1,item_level(hero_level(self.xp))-8):return i.enhancement
   if i.rarity<2 or i.level<20:return 7
   if slot=='weapon':return 20 if i.rarity==4 else 15
   return 12
  opts=[(slot,i) for slot,i in items if i.enhancement<target(slot,i) and (i.enhancement<7 or self.scrolls>0)]
  return min(opts,key=lambda pair:(pair[1].enhancement>=7,pair[0]!='weapon',pair[1].enhancement)) if opts else None
 def desired_refine(self):
  choice=self.refine_target()
  return m.enhancement_cost(choice[1].enhancement+1,choice[1].level,choice[1].rarity) if choice else None
 def enhance(self,day):
  for _ in range(12):
   choice=self.refine_target()
   if not choice:break
   slot,w=choice;n=w.enhancement+1
   if not self.pay(m.enhancement_cost(n,w.level,w.rarity)):break
   protected=n>=8
   if protected:self.scrolls-=1;self.scroll_spent+=1
   self.attempts+=1
   if self.refine_rng.random()<m.CURVE['probabilities'][n-1]:w.enhancement=n
   elif n<=3:pass
   elif protected:w.enhancement-=1
   elif self.refine_rng.random()<m.CURVE['conditionalBreak'][n-1]:self.gear.pop(slot);self.destroyed+=1
   else:w.enhancement-=1
   for v in (3,7,15,20):
    if w.enhancement>=v:self.metrics.setdefault('first'+str(v)+'Day',day)
 def record(self,day):
  super().record(day)
  for L in (100,250,500,750,900,1000):
   if hero_level(self.xp)>=L:self.metrics.setdefault('level'+str(L)+'Day',day)
  if self.hunts['gold']>=750:self.metrics.setdefault('advancedHuntDay',day)

# Optimistic but legal (equal point budget) benchmark kit for XP-per-victory ceiling.
@lru_cache(maxsize=1000)
def benchmark_stats(L):
 a=Account(-1,0,0,0,'swift');a.xp=THRESHOLDS[L-1];a.train=m.initial_build(L,'swift')
 for slot,name in dict(weapon='sword',shield='shield',chest='armor',head='hat',hands='gloves',feet='boots',neck='pendant',ring1='ring',ring2='ring').items():
  i=a.item(name,3,item_level(L),1.);i.enhancement=CONFIG['benchmarkEnhancement'];a.gear[slot]=i
 return a.stats()
BENCH={}
def encounter(stats,kind,floor,variant='r11',damage_multiplier=1):
 if kind!='main':
  t=max(0,(floor-100)/900)
  # Current R1 derives hunt foes from boss stat anchors, not copies of current bosses.
  e=ORIGINAL_ENCOUNTER(stats,kind,floor,variant,damage_multiplier*(1+CONFIG['huntHpRamp']*t*t))
  # Extra attack ramp beyond shared HP/ATK multiplier; no runtime boss modified.
  e['damage']*=1+CONFIG['huntAttackRamp']*t**3
  e['safe']=e['safe'] and e['damage']*1.25<stats['hp'] and (floor<750 or e['seconds']-3<=20+10*(floor-750)/250)
 else:e=ORIGINAL_ENCOUNTER(stats,kind,floor,variant,damage_multiplier)
 e['combatSeconds']=max(0,e['seconds']-(3 if kind!='main' or floor%10==0 else 9))
 return e

def farm(a,kind,floor,seconds,day,config,offline=False,stats=None):
 st=stats or a.stats();e=encounter(st,kind,floor)
 if not e['safe']:a.failures+=1;return False
 cycles=int(seconds/e['seconds']);kills=cycles*e['kills'];a.clock+=seconds
 if not offline:a.active_clock+=seconds
 # No parallel XP, no reward for partial/lost encounters or walking/idle transitions.
 ref=floor if kind=='main' else e['reference'];remaining=cycles;earned=0.
 # Integrate each crossed level: an8h batch must not keep the easier starting-level XP rate.
 while remaining and hero_level(a.xp)<1000:
  L=hero_level(a.xp);eligibility=min(1,(ref/max(1,L))**2);key=(L,kind,floor)
  if key not in BENCH:BENCH[key]=encounter(benchmark_stats(L),kind,floor)['seconds']
  per_victory=min(e['seconds'],BENCH[key])*eligibility
  required=max(1,math.ceil((THRESHOLDS[L]-a.xp)/per_victory))
  take=min(remaining,required);credit=min(THRESHOLDS[-1]-a.xp,take*per_victory)
  a.xp+=credit;earned+=credit;remaining-=take
 a.mastery_earned+=earned
 assert earned<=seconds+1e-6
 if kind=='main':
  t=max(0,(floor-100)/900);coins=math.floor(cycles*e['coin']/(1+3*t*t));a.grant('coin',coins);a.loot(kills,floor,day,offline)
 else:
  qty=math.floor(dict(coal=4,iron=8,gold=2)[kind]*(1+.2*(floor-1))**CONFIG['materialExponent']);a.grant(kind,kills*max(1,qty))
  if kills and kind in ('coal','iron'):
   a.metrics.setdefault('first'+kind.title()+'Day',day);a.metrics.setdefault('first'+kind.title()+'ActiveHours',a.active_clock/3600)
 a.last=(kind,floor);return True

def choose(a,config,stats):
 a.action_index=getattr(a,'action_index',0)+1
 for k in ('coal','iron','gold'):
  if a.hunts[k]<(1 if k=='gold' else 5):
   h=m.best_hunt(a,k,config,stats)
   if h:return k,h
 if a.action_index%4==1 and a.highest<1000:return 'main',a.highest+1
 need=a.next_training_need() or {};refine=a.desired_refine() or {}
 needs={k:max(0,max(need.get(k,0),refine.get(k,0))-a.balances[k]) for k in m.KEYS}
 for k in ('coal','iron','gold'):
  if needs[k]>0:
   h=m.best_hunt(a,k,config,stats)
   if h:return k,h
 if needs['coin']>0:return 'main',max(1,a.highest-(a.highest%10==0))
 # XP farming prefers best throughput in a legal cleared activity; progression reserved above.
 best=None
 L=hero_level(a.xp)
 for kind,f in [('main',max(1,a.highest-(a.highest%10==0)))]+[(k,a.hunts[k]) for k in ('coal','iron','gold') if a.hunts[k]]:
  e=encounter(stats,kind,f)
  if not e['safe']:continue
  key=(L,kind,f)
  if key not in BENCH:BENCH[key]=encounter(benchmark_stats(L),kind,f)['seconds']
  ref=f if kind=='main' else e['reference'];rate=min(e['seconds'],BENCH[key])*min(1,(ref/max(1,L))**2)/e['seconds']
  if best is None or rate>best[0]:best=(rate,kind,f)
 return (best[1],best[2]) if best else ('main',max(1,a.highest-(a.highest%10==0)))

def fallback(a,stats,kind='main'):
 highest=a.highest if kind=='main' else a.hunts[kind]
 for f in range(highest,0,-1):
  if kind=='main' and f%10==0:continue
  if encounter(stats,kind,f)['safe']:return kind,f
 return 'main',1

def advance_block(a,seconds,day,config):
 a.collect_offline_items();a.buy_train();a.enhance(day);st=a.stats();kind,f=choose(a,config,st);remaining=seconds
 while remaining>0:
  st=a.stats();e=encounter(st,kind,f)
  if not e['safe']:
   a.failures+=1;kind,f=fallback(a,st,kind);break
  highest=a.highest if kind=='main' else a.hunts[kind]
  if f<=highest:break
  if remaining<e['seconds']:break
  farm(a,kind,f,e['seconds']+1e-7,day,config,stats=st);remaining-=e['seconds']
  if kind=='main':a.highest=f
  else:a.hunts[kind]=f
  a.record(day)
  if f==1000:break
  f+=1
 if remaining>0:
  highest=a.highest if kind=='main' else a.hunts[kind]
  if f>highest or (kind=='main' and f%10==0) or not encounter(a.stats(),kind,f)['safe']:kind,f=fallback(a,a.stats(),kind)
  farm(a,kind,f,remaining,day,config)
 a.record(day)

configure()

def simulate(n=12,days=150,active=16,offline=8,paid=0,seed=2026101901,mature=False,build=None,quiet=False):
 rows=[]
 for i in range(n):
  a=m.run_account(Account(i,seed+1009*i,active,offline,build or list(m.BUILDS)[i%6],paid=paid,mature=mature),days,dict(variant='r11',weekly_scrolls=30,jade_daily=3,attendance=1 if active>=16 else .85))
  if not quiet:print('account',i,'level',hero_level(a.xp),'main',a.highest,flush=True)
  rows.append(dict(id=i,level=hero_level(a.xp),main=a.highest,hunts=a.hunts,metrics=a.metrics,mastery=a.xp,attempts=a.attempts,balances=a.balances,gear={k:dict(level=v.level,rarity=v.rarity,enhancement=v.enhancement) for k,v in a.gear.items()},clock=a.clock))
 return dict(n=n,days=days,active=active,offline=offline,paid=paid,seed=seed,mature=mature,rows=rows)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--sample',type=int,default=6);p.add_argument('--days',type=int,default=150);p.add_argument('--hours',type=float,default=2304);p.add_argument('--active',type=float,default=16);p.add_argument('--offline',type=float,default=8);p.add_argument('--paid',type=int,default=0);p.add_argument('--output',default='/tmp/r11-pilot.json');args=p.parse_args();configure(args.hours)
 r=simulate(args.sample,args.days,args.active,args.offline,args.paid);r['config']=CONFIG;r['hours']=args.hours
 Path(args.output).write_text(json.dumps(r,indent=2)+'\n')
 for a in r['rows']:print(a['id'],a['level'],a['main'],a['metrics'],flush=True)

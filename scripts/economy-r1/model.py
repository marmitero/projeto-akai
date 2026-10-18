"""Independent forward economy model. Python3.12+, stdlib only. NOT imported by game.
Expected-value encounter resolution with safety margin; finite accounts/time/resources.
All fills of undefined R0 parameters are explicit scenarios, never production decisions.
"""
from __future__ import annotations
import math,random,json,hashlib
from pathlib import Path
from dataclasses import dataclass,field
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'docs/plans/hunts-builds/r1'
BASE=json.loads((DATA/'content-baseline.json').read_text())
CURVE=json.loads((DATA.parent/'curve-analysis.json').read_text())
KEYS=('coin','coal','iron','gold','jade');ATTRS=('force','vitality','agility','physical','magic','luck','dexterity')
WEIGHT=dict.fromkeys(ATTRS,1);WEIGHT['agility']=5
BASE_COST=dict(zip(ATTRS,(100,80,150,100,100,120,90)))
RARITY=(1,1.15,1.35,1.75,2.25) # Recipe cost multipliers, not item stat multipliers.
STAT_RARITY=(1,1.15,1.35,1.7,2.2)
SLOTS=('weapon','shield','chest','head','hands','feet','neck','ring1','ring2')
BUILDS={
 'balanced':(3,2,1,1,1,.5,1), 'swift':(1,1,4,.25,.25,.5,1),
 'brute':(5,2,.25,1,.5,1,1),'physical':(2,4,.1,5,.5,.2,1),
 'magic':(2,4,.1,.5,5,.2,1),'critical':(3,2,.3,1,1,4,2)}
def clamp(v,a,b):return max(a,min(b,v))
def level(xp):return min(1000,1+math.isqrt(max(0,xp)//100))
def gain(n):return 1+.025*n+.0015*n*n
def enhancement_cost(n,L,rarity):
 v=(1+(L-1)/25)*RARITY[rarity]
 return dict(coin=math.ceil(100*v*1.32**(n-1)),coal=math.ceil(2*v*1.25**(n-1)),iron=0 if n<6 else math.ceil(10*v*1.25**(n-6)),gold=0 if n<11 else math.ceil(2*v*1.25**(n-11)),jade=0 if n<16 else math.ceil(.1*v*1.25**(n-16)))
def train_cost(k,n):
 c=dict.fromkeys(KEYS,0);c['coin']=math.ceil(BASE_COST[k]*1.18**min(n-1,20)*(1+max(n-21,0)/20)**2)
 if n%10==0:
  c['iron']=25*(n//10)
  if n>=50:c['coal']=10*(n//10)
  if n>=200:c['gold']=2*(n//10)
 return c
def initial_build(L,name):
 # Equal weighted points, no claimed affordability: a separate mature-build stress fixture.
 values=dict.fromkeys(ATTRS,0);budget=6*(L-1);pref=dict(zip(ATTRS,BUILDS[name]));used=0
 while True:
  choices=[k for k in ATTRS if used+WEIGHT[k]<=budget and values[k]<(min(800,math.ceil(.8*(L-1))) if k=='agility' else 1000)]
  if not choices:break
  k=min(choices,key=lambda k:values[k]*WEIGHT[k]/pref[k]);values[k]+=1;used+=WEIGHT[k]
 return values
@dataclass
class Item:
 id:int; definition:str; rarity:int; level:int; quality:float; enhancement:int=0; owner:int=0
 def score(self):
  d=BASE['items'][self.definition];v=self.level*self.level*STAT_RARITY[self.rarity]*self.quality*gain(self.enhancement)
  return v*(d['attack']+d['hp']/6+d['defense']*.2/self.level)
 def stats(self):
  d=BASE['items'][self.definition];v=self.level*self.level*STAT_RARITY[self.rarity]*self.quality
  return (d['attack']*v*gain(self.enhancement),d['hp']*v*gain(self.enhancement),d['defense']*self.level*STAT_RARITY[self.rarity]*gain(self.enhancement))
@dataclass
class Account:
 id:int;seed:int;active_hours:float;offline_hours:float;build:str;paid:int=0;mature:bool=False;no_drops:bool=False
 balances:dict=field(default_factory=lambda:dict.fromkeys(KEYS,0))
 train:dict=field(default_factory=lambda:dict.fromkeys(ATTRS,0));xp:int=0;highest:int=0;hunts:dict=field(default_factory=lambda:dict(coal=0,iron=0,gold=0))
 gear:dict=field(default_factory=dict);stash:list=field(default_factory=list);scrolls:int=0;last:tuple=('main',1)
 source:dict=field(default_factory=lambda:dict.fromkeys(KEYS,0));spent:dict=field(default_factory=lambda:dict.fromkeys(KEYS,0));initial:dict=field(default_factory=lambda:dict.fromkeys(KEYS,0))
 metrics:dict=field(default_factory=dict);next_id:int=1;clock:float=0;active_clock:float=0;failures:int=0;attempts:int=0;destroyed:int=0;legendary:int=0;eligible_kills:int=0;scroll_spent:int=0;shop_scrolls:int=0;free_scrolls:int=0;jade_events:int=0
 def __post_init__(self):
  self.loot_rng=random.Random(self.seed+11);self.refine_rng=random.Random(self.seed+23);self.event_rng=random.Random(self.seed+37)
  if self.mature:
   self.xp=99_800_100;self.highest=1000;self.hunts=dict(coal=1000,iron=1000,gold=1000);self.train=initial_build(1000,self.build)
   for slot,name in dict(weapon='sword',shield='shield',chest='armor',head='hat',hands='gloves',feet='boots',neck='pendant',ring1='ring',ring2='ring').items():
    self.gear[slot]=self.item(name,4 if slot=='weapon' else 2,100,1.)
   self.legendary=1;self.metrics['firstLegendaryDay']=0;self.metrics['eligibleDay']=0
   for k,v in dict(coin=200000,coal=20000,iron=20000,gold=2000,jade=0).items():self.balances[k]=v;self.initial[k]=v
  else:
   # A guaranteed initial sword is a candidate bootstrap mechanism, not random loot.
   self.gear['weapon']=self.item('sword',0,1,1.)
 def item(self,name,r,L,q):
  x=Item(self.id*10_000_000+self.next_id,name,r,L,q,owner=self.id);self.next_id+=1;return x
 def grant(self,k,n):
  assert n>=0 and isinstance(n,int);self.balances[k]+=n;self.source[k]+=n
 def pay(self,cost):
  if not all(self.balances[k]>=v for k,v in cost.items()):return False
  for k,v in cost.items():self.balances[k]-=v;self.spent[k]+=v
  return True
 def stats(self):
  L=level(self.xp);a=self.train;atk=6+2*a['force']+2*(L-1);hp=100+15*a['vitality']+10*(L-1);df=2*a['physical'];dm=2*a['magic']
  for slot,item in self.gear.items():
   if slot=='shield' and self.gear.get('weapon') and BASE['items'][self.gear['weapon'].definition]['twoHanded']:continue
   aa,hh,dd=item.stats();atk+=aa;hp+=hh;df+=dd;dm+=dd # Explicit scenario: old generic gear defense mapped to both; sensitivity must cover this.
  # Scenario fills unspecified equipment AGI pool: unlocked only via advanced equipped pieces.
  g=sum(22.222222*max(0,(i.level-70)/30)*max(0,(i.rarity-1)/3)*min(1,i.enhancement/20) for i in self.gear.values())
  g=clamp(g,0,200);q=clamp((a['agility']+g)/1000,0,1);aspd=150+40*q**1.25;interval=math.ceil(max(200,20*(200-aspd)))/1000
  return dict(attack=atk,hp=hp,physical=df,magic=dm,interval=interval,critical=clamp(.05+.0004*a['luck'],.05,.45),dexterity=a['dexterity'])
 def buy_train(self):
  pref=dict(zip(ATTRS,BUILDS[self.build]));used=sum(self.train[k]*WEIGHT[k] for k in ATTRS);budget=6*(level(self.xp)-1)
  for _ in range(100):
   choices=[k for k in ATTRS if used+WEIGHT[k]<=budget and self.train[k]<(min(800,math.ceil(.8*(level(self.xp)-1))) if k=='agility' else 1000)]
   if not choices:break
   choices.sort(key=lambda k:self.train[k]*WEIGHT[k]/pref[k]);bought=False
   for k in choices:
    if self.pay(train_cost(k,self.train[k]+1)):
     self.train[k]+=1;used+=WEIGHT[k];bought=True;break
   if not bought:break
 def next_training_need(self):
  pref=dict(zip(ATTRS,BUILDS[self.build]));budget=6*(level(self.xp)-1);used=sum(self.train[k]*WEIGHT[k] for k in ATTRS)
  opts=[k for k in ATTRS if used+WEIGHT[k]<=budget and self.train[k]<(min(800,math.ceil(.8*(level(self.xp)-1))) if k=='agility' else 1000)]
  if not opts:return None
  k=min(opts,key=lambda k:self.train[k]*WEIGHT[k]/pref[k]);return train_cost(k,self.train[k]+1)
 def weapon(self):
  w=self.gear.get('weapon');return w if w and w.rarity==4 else None
 def desired_refine(self):
  w=self.gear.get('weapon')
  if not w:return None
  target=20 if w.rarity==4 else (12 if w.level>=30 and w.rarity>=2 else 7)
  if w.enhancement>=target:return None
  # Do not destroy equipped investment without a scroll. Costs still compete with training.
  if w.enhancement+1>=8 and self.scrolls<1:return None
  return enhancement_cost(w.enhancement+1,w.level,w.rarity)
 def enhance(self,day):
  for _ in range(12):
   w=self.gear.get('weapon');c=self.desired_refine()
   if not w or c is None or not self.pay(c):break
   n=w.enhancement+1;protected=n>=8
   if protected:self.scrolls-=1;self.scroll_spent+=1
   self.attempts+=1
   if self.refine_rng.random()<CURVE['probabilities'][n-1]:w.enhancement=n
   elif n<=3:pass
   elif protected:w.enhancement=max(0,w.enhancement-1)
   elif self.refine_rng.random()<CURVE['conditionalBreak'][n-1]:
    self.destroyed+=1;self.gear.pop('weapon');break
   else:w.enhancement=max(0,w.enhancement-1)
   if w.enhancement>=3:self.metrics.setdefault('first3Day',day)
   if w.enhancement>=7:self.metrics.setdefault('first7Day',day)
   if w.enhancement>=15:self.metrics.setdefault('first15Day',day)
   if w.enhancement==20:self.metrics.setdefault('first20Day',day)
 def receive(self,item):
  if item.level>level(self.xp):self.stash.append(item);return
  slot=BASE['items'][item.definition]['slot']
  if slot=='ring1' and 'ring1' in self.gear and ('ring2' not in self.gear or self.gear['ring2'].score()<self.gear['ring1'].score()):slot='ring2'
  old=self.gear.get(slot)
  if not old or item.score()>old.score()*1.02:
   self.gear[slot]=item
   if old:self.stash.append(old)
  elif item.rarity>=2:self.stash.append(item)
  else:self.grant('coin',max(1,math.floor(item.level*RARITY[item.rarity]*.5)))
  if len(self.stash)>60:
   # Model does not silently delete legendary loot. Overflow ordinary gear is salvaged to Coins only.
   removable=sorted((i for i in self.stash if i.rarity<4),key=lambda i:i.score())
   for x in removable[:len(self.stash)-60]:self.stash.remove(x);self.grant('coin',max(1,math.floor(x.level*RARITY[x.rarity]*.5)))
 def loot(self,kills,floor,day,offline=False):
  if floor>=100 and floor%10!=0:self.eligible_kills+=kills;self.metrics.setdefault('eligibleDay',day)
  if self.no_drops:return
  rng=self.loot_rng;boss=floor%10==0;count=rng.binomialvariate(kills,min(.2,.1+((floor//10)-1)*.001) if boss else .005)
  for _ in range(count):
   roll=rng.random()
   shift=min(.1,(floor//10-1)*.001) if boss else 0
   weights=(.5-shift,.32,.15+shift,.028,.002) if boss else ((.74,.20,.05,.006,.004) if floor>=100 else (.8,.17,.03,0,0))
   cumulative=0;r=0
   for r,weight in enumerate(weights):
    cumulative+=weight
    if roll<cumulative:break
   item=self.item(rng.choice(tuple(BASE['items'])),r,min(100,math.ceil(floor/10)),rng.uniform(.9,1.1))
   if r==4:self.metrics.setdefault('firstLegendaryDay',day)
   if offline:self.stash.append(item) # No auto-equipment or training during absence.
   else:self.receive(item)
  if floor>=100 and not boss:
   n=rng.binomialvariate(kills,.00002);self.scrolls+=n;self.free_scrolls+=n
 def collect_offline_items(self):
  items=self.stash;self.stash=[]
  for x in items:self.receive(x)
 def record(self,day):
  if self.highest>=100:self.metrics.setdefault('main100Day',day)
  if self.highest>=1000:self.metrics.setdefault('campaignDay',day)
  if self.hunts['coal']>=5 and self.hunts['iron']>=5 and self.hunts['gold']>=1:self.metrics.setdefault('allBasicHuntsDay',day)

def encounter(stats,kind,floor,variant='v1',damage_multiplier=1):
 if kind=='main':
  base=BASE['floors'][floor-1];boss=base['boss'];hp=base['hp'];atk=base['attack'];interval=base['interval']/1000;waves=1 if boss else 3;count=1 if boss else 3;ref=floor
  magical=.25 if floor>=11 else 0 # Explicit new-content blend, not a change to current bosses.
  if boss:magical=0
 else:
  ref=min(1000,10*math.ceil(floor/10));base=BASE['floors'][ref-1];r=(floor-1)%10;c=dict(coal=1,iron=1.25,gold=1.6)[kind]
  hp=base['hp']*c*(1+.04*r);atk=base['attack']*c*(1+.025*r);interval=1.8;waves=count=1;boss=False;magical=dict(coal=.3,iron=.1,gold=.6)[kind]
 evasion=(.1*ref+ (120 if kind=='main' and floor%3==1 else 0));hit=clamp(.85+.00015*stats['dexterity']-.0001*evasion,.6,.995)
 dps=stats['attack']*(1+.5*stats['critical'])*hit/stats['interval']
 def mitigation(D):return .75*D/(D+100+2*ref)
 reduction=(1-magical)*(1-mitigation(stats['physical']))+magical*(1-mitigation(stats['magic']))
 groups=BASE['encounters'][floor-1] if kind=='main' else [[[hp,atk,interval*1000,0,10000]]]
 incoming=duration=0.;coin=xp=kills=0;longest=0.
 for group in groups:
  elapsed=0.
  for ehp,eatk,ms,ec,ex in group:
   ttk=max(stats['interval'],math.ceil(ehp*damage_multiplier/dps/stats['interval'])*stats['interval']);elapsed+=ttk;longest=max(longest,ttk)
   incoming+=max(0,math.ceil(elapsed/(ms/1000))-1)*eatk*damage_multiplier*reduction
   coin+=ec;xp+=math.floor(floor*10*ex/10000);kills+=1
  duration+=elapsed+3
 safe=incoming*1.25<stats['hp'] and (not boss or longest<30)
 return dict(safe=safe,seconds=duration,kills=kills,coin=coin,xp=xp,damage=incoming,reference=ref,dps=dps,ehp=stats['hp']/reduction)

def farm(a,kind,floor,seconds,day,config,offline=False,stats=None):
 st=stats or a.stats();e=encounter(st,kind,floor,config['variant'])
 if not e['safe']:a.failures+=1;return False
 cycles=int(seconds/e['seconds']);kills=cycles*e['kills'];assert cycles>=0
 a.clock+=seconds
 if not offline:a.active_clock+=seconds
 if kind=='main':
  a.grant('coin',cycles*e['coin']);a.xp+=cycles*e['xp'];a.loot(kills,floor,day,offline)
 else:
  base=dict(coal=4,iron=8,gold=2)[kind]
  qty=math.floor(base*(1+.2*(floor-1))**(1.3 if config['variant']=='v1' else .65))
  a.grant(kind,kills*max(1,qty));a.xp+=kills*e['reference']*10
  if kills and kind in ['coal','iron']:
   a.metrics.setdefault('first'+kind.title()+'Day',day);a.metrics.setdefault('first'+kind.title()+'ActiveHours',a.active_clock/3600)
 a.last=(kind,floor);return True

def best_hunt(a,kind,config,stats):
 if a.highest<(20 if kind=='gold' else 5):return None
 # Cleared floors independent; new attempts cannot skip uncleared floors.
 highest=a.hunts[kind]
 while highest<1000 and encounter(stats,kind,highest+1,config['variant'])['safe']:
  return highest+1
 return highest if highest and encounter(stats,kind,highest,config['variant'])['safe'] else None

def choose(a,config,stats):
 a.action_index=getattr(a,'action_index',0)+1
 # Reserve progression opportunities; never let optional training bills lock tower access.
 for k in ('coal','iron','gold'):
  if a.hunts[k]<(1 if k=='gold' else 5):
   h=best_hunt(a,k,config,stats)
   if h:return k,h
 if a.action_index%4==1 and a.highest<1000:return 'main',a.highest+1
 needed=a.next_training_need();enhance=a.desired_refine();needs={k:max(0,max((needed or {}).get(k,0),(enhance or {}).get(k,0))-a.balances[k]) for k in KEYS}
 # Coin can always be farmed in already cleared common tower floors.
 if needs['coin']>0:return 'main',max(1,a.highest-(1 if a.highest%10==0 else 0))
 for k in ('iron','coal','gold'):
  if needs[k]>0:
   h=best_hunt(a,k,config,stats)
   if h:return k,h
 # Discover material sources even before a specific bill requires them.
 for k in ('coal','iron','gold'):
  if a.hunts[k]<(1 if k=='gold' else 5):
   h=best_hunt(a,k,config,stats)
   if h:return k,h
 return 'main',min(1000,a.highest+1) if a.highest<1000 else 999

def advance_block(a,seconds,day,config):
 a.collect_offline_items();a.buy_train();a.enhance(day);st=a.stats();kind,f=choose(a,config,st)
 remaining=seconds
 while remaining>0:
  st=a.stats();e=encounter(st,kind,f,config['variant'])
  if not e['safe']:
   a.failures+=1;kind='main';f=max(1,a.highest-(1 if a.highest%10==0 else 0));break
  new=(kind=='main' and f>a.highest) or (kind!='main' and f>a.hunts[kind])
  if not new:break
  if remaining<e['seconds']:break
  # New floors consume real time exactly once, then grant one encounter/floor.
  before=a.clock
  if not farm(a,kind,f,e['seconds']+1e-7,day,config,stats=st):break
  assert abs(a.clock-before-e['seconds'])<1e-4
  remaining-=e['seconds'];
  if kind=='main':a.highest=f
  else:a.hunts[kind]=f
  a.record(day)
  if kind=='main' and a.highest<1000:f+=1
  elif kind!='main' and a.hunts[kind]<1000:f+=1
  else:break
  # Do not grant equipment-dependent stats for a new profile without actually obtaining it.
 if remaining>0:
  if kind=='main' and (f>a.highest or f%10==0):f=max(1,a.highest-(1 if a.highest%10==0 else 0))
  if kind!='main' and f>a.hunts[kind]:f=a.hunts[kind]
  if f and not farm(a,kind,f,remaining,day,config):
   f=max(1,a.highest-(1 if a.highest%10==0 else 0));farm(a,'main',f,remaining,day,config)
 a.record(day)

def run_account(a,days,config):
 for day in range(1,days+1):
  active=a.active_hours*3600
  # Explicit attendance scenarios, no free simultaneous farm during events.
  if day%7==0 and a.event_rng.random()<config.get('attendance',.85) and active>=1800:
   active-=1800;a.clock+=1800;a.active_clock+=1800
   n=config.get('weekly_scrolls',30);a.scrolls+=n;a.free_scrolls+=n
  if day%7==0 and a.paid:
   a.scrolls+=a.paid;a.shop_scrolls+=a.paid # Hypothetically funded Ruby, not a cash-price claim.
  if a.highest>=100 and active>=600 and a.event_rng.random()<config.get('attendance',.85):
   active-=600;a.clock+=600;a.active_clock+=600;a.grant('jade',config.get('jade_daily',3));a.jade_events+=1
  while active>0:
   t=min(1800,active);advance_block(a,t,day,config);active-=t
  # Snapshot stats; selected cleared floor, no boss repeat, no new progression.
  k,f=a.last
  if k=='main':f=min(f,max(1,a.highest));f=max(1,f-(1 if f%10==0 else 0))
  else:f=min(f,a.hunts[k])
  if f and a.offline_hours:farm(a,k,f,min(8,a.offline_hours)*3600,day,config,offline=True,stats=a.stats())
  assert a.clock<=day*(a.active_hours+min(8,a.offline_hours))*3600+.01
  assert all(a.balances[k]==a.initial[k]+a.source[k]-a.spent[k]>=0 for k in KEYS)
  a.record(day)
 return a

def summarize(accounts,days):
 def fraction(metric,limit=None):return sum(metric in a.metrics and (limit is None or a.metrics[metric]<=limit) for a in accounts)/len(accounts)
 def median(values):
  if not values:return None
  v=sorted(values);return v[len(v)//2]
 return dict(n=len(accounts),days=days,main100by30=fraction('main100Day',30),huntsBy30=fraction('allBasicHuntsDay',30),eligible=fraction('eligibleDay'),legendary=fraction('firstLegendaryDay'),any20=fraction('first20Day'),mainMedian=median([a.highest for a in accounts]),huntsMedian={k:median([a.hunts[k] for a in accounts]) for k in ('coal','iron','gold')},levelMedian=median([level(a.xp) for a in accounts]),attemptsMedian=median([a.attempts for a in accounts]),scrollsSpentMedian=median([a.scroll_spent for a in accounts]),balancesMedian={k:median([a.balances[k] for a in accounts]) for k in KEYS},earnedMedian={k:median([a.source[k] for a in accounts]) for k in KEYS},conservationErrors=sum(any(a.balances[k]!=a.initial[k]+a.source[k]-a.spent[k] or a.balances[k]<0 for k in KEYS) for a in accounts),first20Wilson=wilson(sum('first20Day' in a.metrics for a in accounts),len(accounts)))

def wilson(k,n):
 z=1.95996398454;p=k/n;d=1+z*z/n;c=(p+z*z/(2*n))/d;r=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d
 return [max(0,c-r),min(1,c+r)]

def build_grid():
 results=[];wins={k:0 for k in BUILDS}
 for L in (10,100,500,1000):
  for kind,f in [('main',min(999,L)),('coal',max(1,L//2)),('iron',max(1,L//2)),('gold',max(1,L//2))]:
   candidates={}
   for name in BUILDS:
    a=Account(0,1,0,0,name);a.xp=100*(L-1)**2;a.train=initial_build(L,name)
    for slot,item in dict(weapon='sword',shield='shield',chest='armor',head='hat',hands='gloves',feet='boots',neck='pendant',ring1='ring',ring2='ring').items():a.gear[slot]=a.item(item,2,min(100,max(1,math.ceil(L/10))),1.)
    e=encounter(a.stats(),kind,f);candidates[name]=dict(safe=e['safe'],killsPerHour=3600*e['kills']/e['seconds'] if e['safe'] else 0)
   viable=[k for k in BUILDS if candidates[k]['safe']]
   winner=max(viable,key=lambda k:candidates[k]['killsPerHour']) if viable else None
   if winner:wins[winner]+=1
   results.append(dict(level=L,kind=kind,floor=f,winner=winner,builds=candidates))
 total=sum(wins.values());return dict(cases=results,wins=wins,distinctWinners=sum(v>0 for v in wins.values()),largestWinnerShare=max(wins.values())/total if total else 1,viableCases=total)

def protection_stress(n=10000,seed=88172,scroll_budget=390):
 # Resource-unlimited upper-bound scenario, identical bases, protected rolls.
 # Counts failures and +4..7 regressions; no implicit success guarantees.
 rng=random.Random(seed);success=0;attempts=[]
 for _ in range(n):
  lv=0;scrolls=scroll_budget;count=0
  while lv<20 and count<100000:
   dest=lv+1
   if dest>=8:
    if not scrolls:break
    scrolls-=1
   count+=1
   if rng.random()<CURVE['probabilities'][dest-1]:lv=dest
   elif dest>3:lv-=1
  success+=lv==20;attempts.append(count)
 return dict(n=n,scrollBudget=scroll_budget,any20=success/n,confidence95=wilson(success,n),meanAttempts=sum(attempts)/n,meaning='Upper-bound affordability stress, NOT organic account progression')

def bootstrap():
 rows=[]
 for no_sword in (False,True):
  a=Account(0,1001,6,0,'balanced',no_drops=True)
  if no_sword:a.gear={}
  run_account(a,1,dict(variant='v1',jade_daily=0,weekly_scrolls=0))
  rows.append(dict(noRandomDrops=True,starterSword=not no_sword,main=a.highest,hunts=a.hunts,metrics=a.metrics,activeHours=a.active_clock/3600))
 return rows

def cohort(name,n,days,seed,**kwargs):
 cfg=dict(variant=kwargs.pop('variant','v1'),jade_daily=kwargs.pop('jade_daily',3),weekly_scrolls=kwargs.pop('weekly_scrolls',30),attendance=kwargs.pop('attendance',.85))
 accounts=[run_account(Account(i,seed+i*1009,build=list(BUILDS)[i%len(BUILDS)],**kwargs),days,cfg) for i in range(n)]
 return dict(name=name,seed=seed,config=cfg,profile=kwargs,**summarize(accounts,days))

def execute():
 import argparse,time
 parser=argparse.ArgumentParser();parser.add_argument('--sample',type=int,default=120);parser.add_argument('--mature-sample',type=int,default=300);parser.add_argument('--output',default=str(DATA/'results.json'));args=parser.parse_args();start=time.monotonic()
 profiles=[]
 for name,kw in [('regular',dict(active_hours=2,offline_hours=8)),('casual',dict(active_hours=.5,offline_hours=8)),('hardcore',dict(active_hours=8,offline_hours=8)),('paid_regular',dict(active_hours=2,offline_hours=8,paid=10)),('regular_no_offline',dict(active_hours=2,offline_hours=0))]:
  r=cohort(name,args.sample,90,20261018,**kw);profiles.append(r);print(name,r['mainMedian'],r['any20'],flush=True)
 for name,kw in [('mature_free',{}),('mature_paid',dict(paid=10)),('mature_no_jade',dict(jade_daily=0)),('mature_half_events',dict(weekly_scrolls=15)),('mature_double_jade',dict(jade_daily=6)),('mature_unbounded_shop',dict(paid=1000)),('mature_bounded_materials_holdout',dict(variant='bounded-v2'))]:
  r=cohort(name,args.mature_sample,90,417028 if 'holdout' in name else 20261018,active_hours=2,offline_hours=8,mature=True,**kw);profiles.append(r);print(name,r['mainMedian'],r['any20'],flush=True)
 result=dict(version='r1-integration-v1',criteria=json.loads((DATA/'criteria.json').read_text()),assumptions={'combat':'expected damage, 25% safety reserve; no claim of runtime survival probability','event':'30 scrolls/week, 30 active minutes; 85% attendance','jade':'3/day at 10 active minutes, eligibility main100, 85% attendance; future global boss NOT implemented','paid':'10 scrolls/week assuming externally funded Ruby; price unknown','itemSalvage':'Coins only, floor(level*rarityMultiplier*.5)','mature':'Stress fixture: level1000, main/hunts1000, nine level100 items including one legendary weapon, initial resource stock; excludes acquisition time','enemy':'Hypothetical split magic damage/evasion; current boss base numbers retained','market':'Closed transfer/conservation test separately; no human demand model; existing 100k listing fee/10% trade tax','offline':'8h/day only current cleared activity, frozen build; no boss repeats','sensitivity':'bounded-v2 changes only hunt growth exponent 1.3 to .65; fresh holdout seed'},bootstrap=bootstrap(),builds=build_grid(),profiles=profiles,protectionStress=[protection_stress(scroll_budget=n) for n in (180,360,390,480,1000)],unresolved=['Jade availability/participation/rewards and future global boss combat','Ruby scroll prices, funding and commercial limits','New enemy damage/evasion and gear AGI distribution','Human market supply/demand/price discovery and collusion','Legacy migration compensations and rarity grandfathering'],elapsedSeconds=round(time.monotonic()-start,2))
 by={p['name']:p for p in profiles};regular=by['regular'];free=by['mature_free'];paid=by['mature_paid'];g=result['criteria']['gates']
 result['gates']={
 'bootstrap':all(all(row['metrics'].get('first'+k+'ActiveHours',math.inf)<=6 for k in ('Coal','Iron')) for row in result['bootstrap']),
 'regularProgression':regular['main100by30']>=.9 and regular['huntsBy30']>=.9,
 'renewableLegendary':regular['eligible']>=.8 and (regular['legendary']/regular['eligible'] if regular['eligible'] else 0)>=.8,
 'matureScarcity':free['n']>=300 and .01<=free['any20']<=.03,
 'paidAdvantage':paid['any20']-free['any20']<=.1 and by['paid_regular']['mainMedian']/max(1,regular['mainMedian'])<=1.5,
 'buildDiversity':result['builds']['distinctWinners']>=2 and result['builds']['largestWinnerShare']<=.8,
 'sourcesAndConservation':all(p['conservationErrors']==0 for p in profiles),
 'completeness':False}
 result['approved']=all(result['gates'].values());result['hashes']={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (Path(__file__),DATA/'criteria.json',DATA/'content-baseline.json')}
 Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['gates']),flush=True)
if __name__=='__main__':execute()

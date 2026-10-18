"""Independent invariants and finite-market stress; no runtime integration claims."""
import json,random,math,unittest
from pathlib import Path
import model as m

def market_stress(n=120,rounds=90,seed=61922):
 rng=random.Random(seed);cash=[5_000_000]*n;materials=[100_000]*n;initial=sum(cash);initial_material=sum(materials);burned=trades=rejected=0
 # Finite sellers/buyers. No liquidity injection, no infinite buy orders.
 for _ in range(rounds):
  for seller in range(n):
   buyer=rng.randrange(n);qty=min(materials[seller],rng.choice([10,100,1000,10000]));unit=rng.choice([10,20,200,10000]);price=qty*unit
   if buyer==seller or not qty or cash[seller]<100000:rejected+=1;continue
   cash[seller]-=100000;burned+=100000 # Listing fee paid even if unmatched.
   if cash[buyer]<price or rng.random()<.5:rejected+=1;continue
   fee=(price+9)//10;cash[buyer]-=price;cash[seller]+=price-fee;burned+=fee
   materials[seller]-=qty;materials[buyer]+=qty;trades+=1
   assert min(cash)>=0 and min(materials)>=0
 assert sum(cash)+burned==initial and sum(materials)==initial_material
 return dict(n=n,rounds=rounds,seed=seed,trades=trades,rejected=rejected,initialCoin=initial,remainingCoin=sum(cash),coinBurned=burned,materialConserved=sum(materials)==initial_material,coinConserved=sum(cash)+burned==initial,negativeBalances=False,meaning='Closed transfer stress only; synthetic demand/prices, not an equilibrium forecast')

def early_combat(n=5000,seed=61127):
 # Exact Bernoulli hit/critical event timeline for a single initial floor encounter.
 rng=random.Random(seed);a=m.Account(0,1,0,0,'balanced');st=a.stats();wins=0
 for _ in range(n):
  hero_hp=st['hp'];alive=True
  for group in m.BASE['encounters'][0]:
   hps=[float(e[0]) for e in group];next_enemy=[e[2]/1000 for e in group];t=0.;next_hero=st['interval']
   while any(x>0 for x in hps) and alive:
    t=min([next_hero]+[next_enemy[i] for i,x in enumerate(hps) if x>0])
    if next_hero==t:
     idx=next(i for i,x in enumerate(hps) if x>0)
     # Floor1 uses explicit evasion assumption 120.1.
     if rng.random()<m.clamp(.85-.0001*120.1,.6,.995):hps[idx]-=st['attack']*(1.5 if rng.random()<st['critical'] else 1)
     next_hero+=st['interval']
    for i,x in enumerate(hps):
     if x>0 and next_enemy[i]==t:hero_hp-=group[i][1];next_enemy[i]+=group[i][2]/1000
    alive=hero_hp>0
   if not alive:break
  wins+=alive
 return dict(n=n,seed=seed,wins=wins,survival=wins/n,confidence95=m.wilson(wins,n),scope='Initial floor only; no general runtime survival claim')

class ModelInvariants(unittest.TestCase):
 def test_cost_boundaries(self):
  self.assertEqual(m.enhancement_cost(5,1,0),dict(coin=304,coal=5,iron=0,gold=0,jade=0))
  for n in range(1,21):
   c=m.enhancement_cost(n,100,4)
   self.assertEqual(c['iron']>0,n>=6);self.assertEqual(c['gold']>0,n>=11);self.assertEqual(c['jade']>0,n>=16)
 def test_training_milestones(self):
  self.assertEqual(m.train_cost('force',9)['iron'],0);self.assertEqual(m.train_cost('force',10)['iron'],25)
  self.assertEqual(m.train_cost('force',50)['coal'],50);self.assertEqual(m.train_cost('force',200)['gold'],40)
 def test_affordability_atomic(self):
  a=m.Account(1,1,0,0,'balanced');a.grant('coin',100)
  self.assertFalse(a.pay(dict(coin=90,iron=1)));self.assertEqual(a.balances['coin'],100);self.assertEqual(a.spent['coin'],0)
 def test_sources_hunts(self):
  a=m.Account(1,1,0,0,'balanced',mature=True);before=dict(a.balances);xp=a.xp;gear=a.next_id
  for k in ('coal','iron','gold'):m.farm(a,k,1,3600,1,dict(variant='v1'))
  self.assertEqual(a.balances['coin'],before['coin']);self.assertEqual(a.balances['jade'],0);self.assertEqual(a.next_id,gear);self.assertGreater(a.xp,xp)
 def test_no_completed_boss_in_schedule(self):
  a=m.Account(1,1,2,8,'balanced',mature=True)
  m.run_account(a,3,dict(variant='v1'));self.assertFalse(a.last[0]=='main' and a.last[1]%10==0)
  self.assertEqual(a.highest,1000);self.assertLessEqual(a.clock,3*10*3600+.01)
 def test_low_failure_and_protection(self):
  class Fail:
   def random(self):return .999999
  a=m.Account(1,1,0,0,'balanced',mature=True);a.refine_rng=Fail()
  for k in m.KEYS:a.grant(k,10**12)
  a.enhance(1);self.assertEqual(a.gear['weapon'].enhancement,0)
  a.gear['weapon'].enhancement=12;a.scrolls=1;a.enhance(1)
  self.assertEqual(a.gear['weapon'].enhancement,11);self.assertEqual(a.scrolls,0);self.assertEqual(a.destroyed,0)
 def test_rarity_cap(self):
  a=m.Account(1,1,0,0,'balanced');a.gear['weapon'].enhancement=7
  self.assertIsNone(a.desired_refine())
  a.gear['weapon'].rarity=2;a.gear['weapon'].level=50;a.gear['weapon'].enhancement=12
  self.assertIsNone(a.desired_refine())
 def test_speed_cap_and_points(self):
  for name in m.BUILDS:
   a=m.Account(1,1,0,0,name,mature=True)
   self.assertLessEqual(sum(a.train[k]*m.WEIGHT[k] for k in m.ATTRS),5994)
   self.assertGreaterEqual(a.stats()['interval'],.2)
 def test_stash_collection_not_new_items(self):
  a=m.Account(1,1,0,0,'balanced');i=a.item('sword',4,100,1);a.stash=[i]
  a.collect_offline_items();count=a.next_id;a.collect_offline_items();self.assertEqual(a.next_id,count)
 def test_market_conservation(self):
  result=market_stress();self.assertTrue(result['coinConserved']);self.assertTrue(result['materialConserved'])
 def test_markov_independent_montecarlo(self):
  rng=random.Random(48712);total=0;n=5000
  for _ in range(n):
   level=attempts=0
   while level<20:
    attempts+=1;dest=level+1
    if rng.random()<m.CURVE['probabilities'][dest-1]:level=dest
    elif dest>3:level-=1
   total+=attempts
  self.assertLess(abs(total/n-708.0329),40)

if __name__=='__main__':
 suite=unittest.defaultTestLoader.loadTestsFromTestCase(ModelInvariants);result=unittest.TextTestRunner(verbosity=2).run(suite)
 if not result.wasSuccessful():raise SystemExit(1)
 report=dict(tests=result.testsRun,failures=len(result.failures),errors=len(result.errors),market=market_stress(),earlyCombat=early_combat())
 (m.DATA/'audit-results.json').write_text(json.dumps(report,indent=2)+'\n')

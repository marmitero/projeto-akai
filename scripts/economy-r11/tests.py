import unittest,json,random,math
import calibrate as c
import acceptance as a
m=c.m
class CalibrationTests(unittest.TestCase):
 def test_level_thresholds(self):
  self.assertEqual(c.hero_level(0),1);self.assertEqual(c.hero_level(c.THRESHOLDS[-1]),1000)
  self.assertEqual(c.THRESHOLDS[-1]/86400,96)
  self.assertTrue(all(x<y for x,y in zip(c.THRESHOLDS,c.THRESHOLDS[1:])))
  for n in (2,100,500,999):self.assertEqual(c.hero_level(c.THRESHOLDS[n-1]),n)
 def test_bound_for_random_encounters(self):
  rng=random.Random(99812)
  for _ in range(10000):
   duration=rng.uniform(.2,1000);bench=rng.uniform(.2,1000);budget=rng.uniform(0,3600);eligibility=rng.random()
   awarded=int(budget/duration)*min(duration,bench)*eligibility
   self.assertLessEqual(awarded,budget+1e-9)
 def test_cross_level_batch_consistency(self):
  x=c.Account(0,101,0,0,'swift',mature=True,no_drops=True);y=c.Account(1,101,0,0,'swift',mature=True,no_drops=True)
  x.xp=y.xp=c.THRESHOLDS[99];st=x.stats();duration=c.encounter(st,'coal',100)['seconds']
  c.farm(x,'coal',100,duration*200+1e-7,1,{},stats=st)
  for _ in range(200):c.farm(y,'coal',100,duration+1e-7,1,{},stats=st)
  self.assertAlmostEqual(x.xp,y.xp,places=6)
 def test_daily_exclusivity(self):
  for active,offline in ((24,8),(17,8),(-1,8),(16,9)):
   with self.assertRaises(ValueError):m.run_account(c.Account(0,1,active,offline,'swift'),1,{})
 def test_zero_time_no_rewards(self):
  x=c.Account(0,1,0,0,'swift');c.farm(x,'main',1,0,1,{})
  self.assertEqual(x.xp,0);self.assertEqual(x.balances['coin'],0)
 def test_underlevel_farm_inefficient(self):
  x=c.Account(0,1,0,0,'swift',mature=True);x.xp=c.THRESHOLDS[899]
  before=x.xp;c.farm(x,'main',1,3600,1,{})
  self.assertLess(x.xp-before,3600/10000)
 def test_gear_level_eligibility(self):
  x=c.Account(0,1,0,0,'swift');item=x.item('armor',4,100,1)
  x.receive(item);self.assertNotIn('chest',x.gear)
  x.xp=c.THRESHOLDS[990];x.collect_offline_items();self.assertEqual(x.gear['chest'].id,item.id)
 def test_no_gear_free_victory(self):
  x=c.Account(0,1,0,0,'swift',mature=True);x.gear={}
  self.assertFalse(c.encounter(x.stats(),'main',999)['safe']);self.assertFalse(c.encounter(x.stats(),'gold',1000)['safe'])
 def test_ablation(self):
  rows=a.ablation()
  self.assertTrue(all(not x['encounters']['main999']['safe'] and not x['encounters']['gold1000']['safe'] for x in rows if x['refine']==0))
  self.assertTrue(any(x['encounters']['main999']['safe'] and x['encounters']['gold1000']['safe'] for x in rows if x['rarity']==3 and x['refine']==12))
 def test_failure_unchanged(self):
  class Fail:
   def random(self):return .999999
  x=c.Account(0,1,0,0,'swift',mature=True);x.refine_rng=Fail()
  for k in m.KEYS:x.grant(k,10**12)
  x.enhance(1);self.assertEqual(x.gear['weapon'].enhancement,0)
  for i in x.gear.values():i.enhancement=7
  x.gear['weapon'].enhancement=15;x.scrolls=1;x.enhance(1)
  self.assertEqual(x.gear['weapon'].enhancement,14);self.assertEqual(x.scrolls,0);self.assertEqual(x.destroyed,0)
 def test_recipe_boundaries(self):
  for n in range(1,21):
   cost=c.enhancement_cost(n,100,4)
   self.assertEqual(cost['iron']>0,n>=6);self.assertEqual(cost['gold']>0,n>=11);self.assertEqual(cost['jade']>0,n>=16)
  self.assertEqual(c.enhancement_cost(10,100,4),c.ORIGINAL_COST(10,100,4))
  self.assertEqual(c.enhancement_cost(11,100,4)['iron'],8*c.ORIGINAL_COST(11,100,4)['iron'])
 def test_tower_boss_definitions_unchanged(self):
  for floor in range(10,1001,10):self.assertEqual(m.BASE['encounters'][floor-1],c.ORIGINAL_BASE['encounters'][floor-1])
 def test_material_isolation_and_accounting(self):
  x=c.Account(0,1,0,0,'swift',mature=True);initial=dict(x.balances);itemcount=x.next_id
  for k in ('coal','iron','gold'):c.farm(x,k,1,3600,1,{})
  self.assertEqual(x.balances['coin'],initial['coin']);self.assertEqual(x.balances['jade'],initial['jade']);self.assertEqual(x.next_id,itemcount)
  for k in m.KEYS:self.assertEqual(x.balances[k],x.initial[k]+x.source[k]-x.spent[k])
 def test_retry_can_return_to_safe_cleared_floor(self):
  x=c.Account(0,1,0,0,'swift',mature=True);x.gear={};kind,floor=c.fallback(x,x.stats())
  self.assertLess(floor,999);self.assertNotEqual(floor%10,0);self.assertTrue(c.encounter(x.stats(),kind,floor)['safe'])
 def test_no_boss_offline_repeat(self):
  x=c.Account(0,1,2,8,'swift',mature=True);m.run_account(x,1,dict(variant='r11',weekly_scrolls=0,jade_daily=0))
  self.assertFalse(x.last[0]=='main' and x.last[1]%10==0)
 def test_censored_quantiles(self):
  r=dict(n=3,days=100,active=24,offline=0,paid=0,seed=1,mature=False,rows=[dict(metrics={'level1000Day':99},level=1000,main=1000),dict(metrics={},level=999,main=900),dict(metrics={},level=800,main=750)])
  result=a.summary(r);self.assertIsNone(result['maxLevelDays']['p50']);self.assertEqual(result['maxLevelBy120Fraction'],1/3)

if __name__=='__main__':
 suite=unittest.defaultTestLoader.loadTestsFromTestCase(CalibrationTests);r=unittest.TextTestRunner(verbosity=2).run(suite)
 (c.OUT/'tests.json').write_text(json.dumps(dict(tests=r.testsRun,failures=len(r.failures),errors=len(r.errors)))+'\n')
 if not r.wasSuccessful():raise SystemExit(1)

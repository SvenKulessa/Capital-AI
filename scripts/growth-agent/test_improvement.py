import sqlite3, unittest, tempfile
from pathlib import Path
from improvement import *

class TestCycle(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.path=Path(self.tmp.name)/'fixture.sqlite3'; self.db=sqlite3.connect(self.path); setup(self.db)
    def tearDown(self): self.db.close(); self.tmp.cleanup()
    def record(self,i,**kw):
        args=dict(scope='GROWTH',run_id=str(i),source_sha='a'*40,receipt='b'*64,state='COMPLETED',evaluated=True); args.update(kw); return record_completed(self.db,**args)
    def test_third_and_sixth(self):
        self.assertIsNone(self.record(1)); self.assertIsNone(self.record(2)); first=self.record(3); self.assertTrue(first); self.assertTrue(acknowledge(self.db,'GROWTH',first,readback_verified=True)); self.assertIsNone(self.record(4)); self.assertIsNone(self.record(5)); self.assertNotEqual(first,self.record(6))
    def test_replay_and_restart(self):
        self.record(1); self.record(2); first=self.record(3); self.db.close(); self.db=sqlite3.connect(self.path); self.assertEqual(first,self.record(3)); self.assertEqual(first,next_pending(self.db,'GROWTH')); self.assertFalse(acknowledge(self.db,'GROWTH',first,readback_verified=False)); self.assertEqual(first,next_pending(self.db,'GROWTH'))
    def test_wait_and_duplicate(self):
        self.record(1); self.record(1); self.record(2,state='WAIT'); self.record(2,evaluated=False); self.assertIsNone(self.record(3)); self.assertTrue(self.record(4))
    def test_conflicting_replay(self):
        self.record(1); self.assertRaises(ValueError,self.record,1,source_sha='c'*40)
    def test_scope_isolation(self):
        self.record(1); self.record(2,scope='TRUST'); self.assertIsNone(self.record(3)); self.assertTrue(self.record(4))

class TestDecision(unittest.TestCase):
    def setUp(self):
        self.base=dict.fromkeys(METRICS,80); self.candidate=dict.fromkeys(METRICS,85); self.gates=dict.fromkeys(('security','rights','data_integrity','cost','compatibility'),True)
    def decide(self,**kw):
        args=dict(hard_gates=self.gates,comparison_verified=True,document_sync=True); args.update(kw); return decide(self.base,self.candidate,**args)['action']
    def test_positive(self): self.assertEqual(self.decide(),'PROPOSE_PR')
    def test_regression(self): self.candidate['trustAndSafety']=79; self.assertEqual(self.decide(),'DISCARD_CANDIDATE')
    def test_hard_gate(self): self.gates['rights']=False; self.assertEqual(self.decide(),'DISCARD_CANDIDATE')
    def test_missing(self): self.assertEqual(self.decide(document_sync=False),'HOLD')
    def test_unknown_gate(self): self.gates['cost']=None; self.assertEqual(self.decide(),'HOLD')
    def test_nan(self): self.candidate['taskCompletion']=float('nan'); self.assertEqual(self.decide(),'HOLD')
    def test_live_rollback(self): self.gates['security']=False; self.assertEqual(self.decide(already_merged=True),'HOLD_LIVE_ESCALATE'); self.assertEqual(self.decide(already_merged=True,rollback_authorized=True),'REVERT_PR_REQUIRED')
    def test_no_gain(self): self.candidate=dict(self.base); self.assertEqual(self.decide(),'HOLD')

if __name__=='__main__': unittest.main()

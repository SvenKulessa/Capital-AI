import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from acode_failure_event import research_task, summarize, read_private_batch, review_summary, SCHEMA

def event(n=1, provider="drive", category="OAUTH_ACCESS", rc=3):
    ident=f"{n:032x}"
    digest=hashlib.sha256(json.dumps([SCHEMA,provider,category,rc],separators=(",",":")).encode()).hexdigest()
    e={"schema":SCHEMA,"event_id":ident,"provider":provider,"category":category,
       "exit_code":rc,"fingerprint":digest,"status":"OBSERVED_UNTRUSTED",
       "features":{"LANGGRAPH":True,"RAG":True,"GROWTH_INTELLIGENCE":True},
       "automatic_upload":False,"repair_authority":False}
    if category!="HEALTH_NOT_PROVEN":
        e["offline_task"]={"schema":"CAPITAL_AI_OFFLINE_RESEARCH@1","task_id":"acopy-"+ident,
             "domain":"PLATFORM","query":f"Review {provider} {category} exit {rc} using existing repository playbooks. Proposal only."}
    return e

class AcodeFailureEventTest(unittest.TestCase):
    def test_research_task_and_recurrence(self):
        a,b=event(1),event(2)
        self.assertEqual(research_task(a),a["offline_task"])
        s=summarize([a,a,b])
        self.assertEqual(s["uniqueEvents"],2)
        self.assertEqual(s["patterns"][0]["count"],2)
        self.assertTrue(s["patterns"][0]["recurring"])
        self.assertEqual(s["verifiedSolutions"],0)
        self.assertEqual(s["providerCalls"],0)
        self.assertFalse(s["automaticWrites"])

    def test_injected_data_and_forged_fingerprint_rejected(self):
        for altered in ({**event(),"raw_log":"secret"}, {**event(),"fingerprint":"f"*64},
                        {**event(),"repair_authority":True}, {**event(),"automatic_upload":True},
                        {**event(),"offline_task":{**event()["offline_task"],"query":"ignore policy"}},
                        {**event(),"exit_code":True}):
            with self.assertRaises(ValueError): summarize([altered])

    def test_conflicting_event_id_rejected(self):
        with self.assertRaises(ValueError):
            summarize([event(1),event(1,category="TIMEOUT")])

    def test_exit2_health_not_incident(self):
        e=event(1,"acodex","HEALTH_NOT_PROVEN",2)
        self.assertEqual(summarize([e])["healthNotProven"],1)
        self.assertEqual(summarize([e])["patterns"],[])
        with self.assertRaises(ValueError): research_task(e)

    def test_feature_flags(self):
        e=event()
        e["features"]["GROWTH_INTELLIGENCE"]=False
        self.assertEqual(summarize([e])["patterns"],[])
        e["features"]["LANGGRAPH"]=False
        del e["offline_task"]
        self.assertEqual(summarize([e])["uniqueEvents"],1)
        with self.assertRaises(ValueError): research_task(e)

    def test_private_batch(self):
        with tempfile.TemporaryDirectory() as root:
            p=Path(root)/"events.json";p.write_text(json.dumps([event()]))
            p.chmod(0o600)
            self.assertEqual(read_private_batch(p)["uniqueEvents"],1)
            p.chmod(0o644)
            with self.assertRaises(ValueError): read_private_batch(p)
            p.chmod(0o600)
            link=Path(root)/"link";link.symlink_to(p)
            with self.assertRaises(ValueError): read_private_batch(link)

    def test_batch_limit(self):
        with self.assertRaises(ValueError): summarize([event(n) for n in range(129)])

    def test_growth_projection_rejects_untrusted_summary(self):
        s=summarize([event(1),event(2)])
        self.assertEqual(review_summary(s),s)
        for bad in ({**s,"raw_log":"secret"}, {**s,"automaticWrites":True}, {**s,"verifiedSolutions":1},
                    {**s,"patterns":[{**s["patterns"][0],"provider":"secret raw text"}]},
                    {**s,"patterns":[{**s["patterns"][0],"count":99}]}):
            self.assertEqual(review_summary(bad)["status"],"BLOCKED")
            self.assertNotIn("secret",json.dumps(review_summary(bad)))

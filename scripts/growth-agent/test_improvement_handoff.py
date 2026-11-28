import sqlite3
import unittest
from improvement_handoff import observe_terminal, compare_reports, WEIGHTS

SCOPE = 'a' * 64
GATES = dict.fromkeys(('security', 'rights', 'data_integrity', 'cost', 'compatibility'), True)
HYGIENE = dict(schema='CAPITAL_AI_HYGIENE_LIFECYCLE@1', readbackMatch=True, comparable=True, regression=False)


def report(percent):
    return dict(schemaVersion='SOLO2_CHAT_BENCHMARK@1', coverage=100, taskClass='routing',
                dimensions={k: dict(status='VERIFIED', maxScore=w, score=w*percent/100,
                                    evidenceRefs=['fixture']) for k, w in WEIGHTS.items()})


def proof(state):
    return dict(scope=SCOPE, task_id=state['task_id'], source_sha='b'*40, receipt='c'*64, evaluated=True)


class HandoffTests(unittest.TestCase):
    def test_third_unique_verified_checkpoint(self):
        with sqlite3.connect(':memory:') as db:
            for i in (1, 1, 2):
                self.assertEqual(observe_terminal(dict(status='VERIFIED', merge_sha='b'*40, task_id=str(i)), scope=SCOPE, db=db, verifier=proof)['status'], 'RECORDED')
            result = observe_terminal(dict(status='VERIFIED', merge_sha='b'*40, task_id='3'), scope=SCOPE, db=db, verifier=proof)
            self.assertEqual(result['status'], 'IMPROVEMENT_DUE')
            self.assertEqual(result, observe_terminal(dict(status='VERIFIED', merge_sha='b'*40, task_id='3'), scope=SCOPE, db=db, verifier=proof))

    def test_untrusted_wait_and_wrong_scope(self):
        with sqlite3.connect(':memory:') as db:
            for status, scope, verifier in [('WAIT', SCOPE, proof), ('VERIFIED', SCOPE, None), ('VERIFIED', 'd'*64, proof), ('VERIFIED', SCOPE, lambda state: {**proof(state), 'source_sha': 'd'*40})]:
                self.assertEqual(observe_terminal(dict(status=status, merge_sha='b'*40, task_id='1'), scope=scope, db=db, verifier=verifier)['status'], 'NOT_PROVEN')

    def test_benchmark_and_document_sync(self):
        kwargs = dict(hard_gates=GATES, comparison_verified=True, hygiene=HYGIENE)
        self.assertEqual(compare_reports(report(80), report(85), **kwargs)['action'], 'PROPOSE_PR')
        self.assertEqual(compare_reports(report(80), report(75), **kwargs)['action'], 'DISCARD_CANDIDATE')
        self.assertEqual(compare_reports(report(80), report(85), **{**kwargs, 'hygiene': {}})['action'], 'HOLD')

    def test_document_regression_and_verifier_failure(self):
        kwargs = dict(hard_gates=GATES, comparison_verified=True, hygiene={**HYGIENE, 'regression': True})
        self.assertEqual(compare_reports(report(80), report(85), **kwargs)['reason'], 'DOCUMENT_REGRESSION')
        self.assertEqual(compare_reports(report(80), report(85), **kwargs, already_merged=True, rollback_authorized=True)['action'], 'REVERT_PR_REQUIRED')
        def failed(_): raise RuntimeError('not recorded')
        with sqlite3.connect(':memory:') as db:
            self.assertEqual(observe_terminal(dict(status='VERIFIED', merge_sha='b'*40, task_id='1'), scope=SCOPE, db=db, verifier=failed)['status'], 'NOT_PROVEN')

    def test_incomplete_and_incomparable(self):
        kwargs = dict(hard_gates=GATES, comparison_verified=True, hygiene=HYGIENE)
        candidate = report(85)
        candidate['dimensions']['trustAndSafety']['status'] = 'NOT_PROVEN'
        self.assertEqual(compare_reports(report(80), candidate, **kwargs)['action'], 'HOLD')
        self.assertEqual(compare_reports(report(80), {**report(85), 'taskClass': 'other'}, **kwargs)['action'], 'HOLD')

if __name__ == '__main__': unittest.main()

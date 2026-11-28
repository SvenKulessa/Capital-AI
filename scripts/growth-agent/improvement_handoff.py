"""Trusted terminal checkpoint handoff; no network, scheduler or merge authority."""
from improvement import record_completed, setup, decide, valid, SHA, DIGEST, ID, METRICS

TERMINAL = frozenset(('VERIFIED', 'MERGED', 'TESTED'))
WEIGHTS = dict(zip(METRICS, (25, 20, 15, 15, 15, 10)))


def normalize_benchmark(report):
    """Read the existing SOLO2_CHAT_BENCHMARK@1, never invent missing scores."""
    if (type(report) is not dict or report.get('schemaVersion') != 'SOLO2_CHAT_BENCHMARK@1'
            or report.get('coverage') != 100 or type(report.get('dimensions')) is not dict
            or set(report['dimensions']) != set(METRICS)):
        return None
    scores = {}
    for key, weight in WEIGHTS.items():
        item = report['dimensions'][key]
        if (type(item) is not dict or item.get('status') != 'VERIFIED'
                or item.get('maxScore') != weight or type(item.get('score')) not in (int, float)
                or not 0 <= item['score'] <= weight or type(item.get('evidenceRefs')) is not list
                or not item['evidenceRefs'] or not all(isinstance(r, str) and r.strip() for r in item['evidenceRefs'])):
            return None
        scores[key] = 100 * item['score'] / weight
    return scores


def observe_terminal(state, *, scope, db, verifier):
    """Only a caller-injected verifier may attest an exact, evaluated completion.

    Shared owner-private connection belongs to the existing trusted runtime.
    A task/checkpoint ID is not sufficient to authenticate a receipt.
    """
    if type(state) is not dict or state.get('status') not in TERMINAL or not valid(ID, state.get('task_id')):
        return {'status': 'NOT_PROVEN', 'cycle_id': None}
    source = state.get('merge_sha') if state['status'] in ('MERGED', 'VERIFIED') else (state.get('evidence') or {}).get('head_sha')
    if not valid(SHA, source) or not valid(DIGEST, scope) or not callable(verifier) or db.in_transaction:
        return {'status': 'NOT_PROVEN', 'cycle_id': None}
    try:
        proof = verifier(state.copy())
    except Exception:
        return {'status': 'NOT_PROVEN', 'cycle_id': None}
    if (type(proof) is not dict or set(proof) != {'scope', 'task_id', 'source_sha', 'receipt', 'evaluated'}
            or proof['scope'] != scope or proof['task_id'] != state['task_id']
            or proof['evaluated'] is not True or proof['source_sha'] != source
            or not valid(DIGEST, proof['receipt'])):
        return {'status': 'NOT_PROVEN', 'cycle_id': None}
    setup(db)
    cycle = record_completed(db, scope=scope, run_id=proof['task_id'], source_sha=proof['source_sha'],
                             receipt=proof['receipt'], state='COMPLETED', evaluated=True)
    return {'status': 'IMPROVEMENT_DUE' if cycle else 'RECORDED', 'cycle_id': cycle}


def compare_reports(baseline, candidate, *, hard_gates, comparison_verified, hygiene,
                    already_merged=False, rollback_authorized=False):
    """Independent comparator must attest same scope, method and paired cohort."""
    before, after = normalize_benchmark(baseline), normalize_benchmark(candidate)
    sync = (type(hygiene) is dict and hygiene.get('schema') == 'CAPITAL_AI_HYGIENE_LIFECYCLE@1'
            and hygiene.get('readbackMatch') is True and hygiene.get('comparable') is True
            and hygiene.get('regression') is False)
    comparable = (comparison_verified is True and before is not None and after is not None
                  and baseline.get('taskClass') == candidate.get('taskClass')
                  and isinstance(baseline.get('taskClass'), str)
                  and baseline.get('taskClass') not in ('', 'UNCLASSIFIED'))
    if (comparable and type(hygiene) is dict and hygiene.get('schema') == 'CAPITAL_AI_HYGIENE_LIFECYCLE@1'
            and hygiene.get('readbackMatch') is True and hygiene.get('comparable') is True
            and hygiene.get('regression') is True):
        action = ('REVERT_PR_REQUIRED' if rollback_authorized is True else 'HOLD_LIVE_ESCALATE') if already_merged else 'DISCARD_CANDIDATE'
        return dict(action=action, reason='DOCUMENT_REGRESSION', production_verified=False, commercial_authorized=False)
    return decide(before, after, hard_gates=hard_gates, comparison_verified=comparable,
                  document_sync=sync, already_merged=already_merged,
                  rollback_authorized=rollback_authorized)

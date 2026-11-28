"""Offline reference: transactionally count completed runs and decide candidate disposition.
Caller supplies an existing owner-private SQLite connection, trusted evidence and authority.
No scheduler, provider writes, network or production status promotion.
"""
import json, math, re, sqlite3
from hashlib import sha256

SHA = re.compile(r'[0-9a-f]{40}\Z')
DIGEST = re.compile(r'[0-9a-f]{64}\Z')
ID = re.compile(r'[A-Za-z0-9._:-]{1,96}\Z')
METRICS = ('taskCompletion','evidenceQuality','executionEfficiency','technicalQuality','trustAndSafety','communicationAndAccessibility')

def valid(pattern, value):
    return isinstance(value,str) and pattern.fullmatch(value) is not None

def setup(db):
    db.execute('''CREATE TABLE IF NOT EXISTS improvement_runs_v1 (
        scope TEXT NOT NULL, run_id TEXT NOT NULL, source_sha TEXT NOT NULL,
        receipt TEXT NOT NULL, seq INTEGER NOT NULL,
        PRIMARY KEY(scope,run_id), UNIQUE(scope,seq))''')
    db.execute('''CREATE TABLE IF NOT EXISTS improvement_batches_v1 (
        scope TEXT NOT NULL, batch INTEGER NOT NULL, cycle_id TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL DEFAULT 'PENDING', PRIMARY KEY(scope,batch))''')
    db.commit()

def record_completed(db, *, scope, run_id, source_sha, receipt, state, evaluated):
    """Call after durable terminal checkpoint; replay returns the same pending batch.
    WAIT, retries, blocked/unassessed work never increment. Single existing worker owns DB.
    """
    if state != 'COMPLETED' or evaluated is not True:
        return None
    if not (valid(ID,scope) and valid(ID,run_id) and valid(SHA,source_sha) and valid(DIGEST,receipt)):
        raise ValueError('invalid trusted run receipt')
    db.execute('BEGIN IMMEDIATE')
    try:
        old=db.execute('SELECT source_sha,receipt,seq FROM improvement_runs_v1 WHERE scope=? AND run_id=?',(scope,run_id)).fetchone()
        if old:
            if tuple(old[:2]) != (source_sha,receipt): raise ValueError('conflicting replay')
            seq=old[2]
        else:
            seq=db.execute('SELECT COALESCE(MAX(seq),0)+1 FROM improvement_runs_v1 WHERE scope=?',(scope,)).fetchone()[0]
            db.execute('INSERT INTO improvement_runs_v1 VALUES(?,?,?,?,?)',(scope,run_id,source_sha,receipt,seq))
        if seq%3==0:
            batch=seq//3
            cycle=sha256(json.dumps([scope,batch],separators=(',',':')).encode()).hexdigest()
            db.execute('INSERT OR IGNORE INTO improvement_batches_v1(scope,batch,cycle_id) VALUES(?,?,?)',(scope,batch,cycle))
        db.commit()
    except BaseException:
        db.rollback(); raise
    return next_pending(db,scope)

def next_pending(db,scope):
    row=db.execute("SELECT cycle_id FROM improvement_batches_v1 WHERE scope=? AND state='PENDING' ORDER BY batch LIMIT 1",(scope,)).fetchone()
    return row[0] if row else None

def acknowledge(db,scope,cycle_id,*,readback_verified):
    """Only after trusted artifact/PR readback. Retry after crash uses same cycle ID."""
    if readback_verified is not True: return False
    with db:
        cur=db.execute("UPDATE improvement_batches_v1 SET state='RECORDED' WHERE scope=? AND cycle_id=? AND state='PENDING'",(scope,cycle_id))
    return cur.rowcount==1

def decide(baseline,candidate,*,hard_gates,comparison_verified,document_sync,already_merged=False,rollback_authorized=False):
    """Pure policy; evidence values must be derived by independent trusted adapters.
    Scores are normalized 0..100 per dimension; fixed thresholds are prototype values.
    Never infer merge or production authority from a score.
    """
    def result(action, reason): return {'action':action,'reason':reason,'production_verified':False,'commercial_authorized':False}
    if not isinstance(hard_gates,dict) or set(hard_gates)!={'security','rights','data_integrity','cost','compatibility'}:
        return result('HOLD','MISSING_GATES')
    def reject(reason):
        return result(('REVERT_PR_REQUIRED' if rollback_authorized is True else 'HOLD_LIVE_ESCALATE') if already_merged else 'DISCARD_CANDIDATE',reason)
    if any(v is False for v in hard_gates.values()): return reject('HARD_GATE_FAILED')
    if any(v is not True for v in hard_gates.values()) or comparison_verified is not True or document_sync is not True:
        return result('HOLD','EVIDENCE_INCOMPLETE')
    def check(x):
        return isinstance(x,dict) and set(x)==set(METRICS) and all(type(v) in (int,float) and math.isfinite(v) and 0<=v<=100 for v in x.values())
    if not check(baseline) or not check(candidate): return result('HOLD','INVALID_OR_MISSING_METRICS')
    weights=(25,20,15,15,15,10)
    delta=sum(w*(candidate[k]-baseline[k]) for k,w in zip(METRICS,weights))/100
    if candidate['trustAndSafety']<baseline['trustAndSafety'] or min(candidate[k]-baseline[k] for k in METRICS)<-2 or delta<0:
        return reject('REGRESSION')
    if delta<2: return result('HOLD','IMPROVEMENT_NOT_PROVEN')
    return result('PROPOSE_PR','BENCHMARK_IMPROVED')

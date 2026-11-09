"""Isolated synthetic pilot: no provider, network, secrets, or production database."""
import argparse,csv,hashlib,json,platform,re,tempfile,time
from pathlib import Path
import duckdb


def tenant_aggregate(connection, tenant_id):
    if not isinstance(tenant_id,str) or not tenant_id.strip():
        raise ValueError('TENANT_REQUIRED')
    return connection.execute('SELECT category, count(*) AS event_count, sum(duration_ms) AS duration_ms FROM events WHERE tenant_id = ? GROUP BY category ORDER BY category',[tenant_id]).fetchall()


def run(source_sha,output):
    if not re.fullmatch('[a-f0-9]{40}',source_sha):
        raise ValueError('SOURCE_SHA_REQUIRED')
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    started=time.perf_counter()
    with tempfile.TemporaryDirectory(prefix='capital-ai-duckdb-') as temporary:
        connection=duckdb.connect(str(Path(temporary)/'pilot.duckdb'),config={'threads':1,'memory_limit':'128MB','autoinstall_known_extensions':'false','autoload_known_extensions':'false'})
        connection.execute('CREATE TABLE events(event_id INTEGER, tenant_id VARCHAR, category VARCHAR, duration_ms INTEGER)')
        rows=[(1,'tenant-a','learning',12),(2,'tenant-a','learning',18),(3,'tenant-a','content',30),
              (4,'tenant-b','learning',700),(5,'tenant-b','content',800),(6,'tenant-b','content',900)]
        connection.executemany('INSERT INTO events VALUES (?, ?, ?, ?)',rows)
        parquet=Path(temporary)/'synthetic.parquet'
        connection.execute('COPY events TO ? (FORMAT PARQUET)',[str(parquet)])
        parquet_count=connection.execute('SELECT count(*) FROM read_parquet(?)',[str(parquet)]).fetchone()[0]
        assert parquet_count==6
        a=tenant_aggregate(connection,'tenant-a');b=tenant_aggregate(connection,'tenant-b')
        assert a==[('content',1,30),('learning',2,30)]
        assert b==[('content',2,1700),('learning',1,700)]
        assert tenant_aggregate(connection,'tenant-missing')==[]
        assert tenant_aggregate(connection,"tenant-a' OR TRUE --")==[]
        try:tenant_aggregate(connection,'')
        except ValueError:pass
        else:raise AssertionError('missing tenant accepted')
        csv_path=output/'synthetic-tenant-a.csv'
        with csv_path.open('w',newline='',encoding='utf-8') as stream:
            writer=csv.writer(stream,lineterminator='\n');writer.writerow(['category','event_count','duration_ms']);writer.writerows(a)
        assert sum(row[1] for row in a)==3
        imported=connection.execute('SELECT sum(event_count), sum(duration_ms) FROM read_csv_auto(?)',[str(csv_path)]).fetchone()
        assert imported==(3,60)
        bulk=Path(temporary)/'synthetic-million.parquet'
        bulk_started=time.perf_counter()
        connection.execute("COPY (SELECT range AS event_id, CASE WHEN range % 2 = 0 THEN 'tenant-a' ELSE 'tenant-b' END AS tenant_id, range % 1000 AS duration_ms FROM range(1000000)) TO ? (FORMAT PARQUET)",[str(bulk)])
        bulk_rows=connection.execute('SELECT count(*) FROM read_parquet(?)',[str(bulk)]).fetchone()[0]
        bulk_tenant=connection.execute('SELECT count(*) FROM read_parquet(?) WHERE tenant_id = ?',[str(bulk),'tenant-a']).fetchone()[0]
        assert bulk_rows==1000000 and bulk_tenant==500000
        bulk_result={'rows':bulk_rows,'tenantARows':bulk_tenant,'parquetBytes':bulk.stat().st_size,
            'elapsedMs':round((time.perf_counter()-bulk_started)*1000,3),'mode':'SYNTHETIC_LOCAL_SAMPLE_NOT_PRODUCTION_SLA'}
        connection.close()
        result={'schema':'CAPITAL_AI_DUCKDB_PILOT@1','baseMainSha':source_sha,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'engineVersion':duckdb.__version__,
            'pythonVersion':platform.python_version(),'dataKind':'SYNTHETIC_ONLY','externalCalls':0,
            'constraints':{'threads':1,'memoryLimit':'128MB','extensionAutoload':False},
            'checks':{'parquetRoundTrip':True,'tenantAExpectedRows':True,'tenantBExcludedFromExport':True,
                'unknownTenantEmpty':True,'sqlInjectionTenantEmpty':True,'missingTenantRejected':True,'csvRoundTrip':True},
            'inputRows':6,'exportedTenantEvents':3,'bulkSample':bulk_result,'csvSha256':hashlib.sha256(csv_path.read_bytes()).hexdigest(),
            'elapsedMs':round((time.perf_counter()-started)*1000,3),
            'productionAuthIsolation':'NOT_PROVEN','powerBiDesktopImport':'NOT_PROVEN','powerBiEmbedded':'NOT_PROVEN'}
        (output/'duckdb-readback.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--source-sha',required=True);parser.add_argument('--output',required=True)
    args=parser.parse_args();run(args.source_sha,args.output)

import { QuoteDeliverySchema, MarketSnapshotSchema, isFresh } from '../../shared/market-contracts.mjs';

type Quote = ReturnType<typeof QuoteDeliverySchema.parse>;
export async function loadMarketSnapshot(signal: AbortSignal, fetchImpl = fetch): Promise<Quote[]> {
  let cursor: string | null = null;
  const records = new Map<string, Quote>();
  let universe: string | undefined, total: number | undefined;
  for (let page = 0; page < 90; page++) {
    const response = await fetchImpl('/api/market/snapshot?limit=100' + (cursor ? '&cursor=' + cursor : ''), {
      cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok || !response.body) throw new Error('SNAPSHOT_UNAVAILABLE');
    const reader = response.body.getReader();
    let bytes = 0; const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 1048576) throw new Error('SNAPSHOT_TOO_LARGE');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const buffer = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    const result = MarketSnapshotSchema.parse(JSON.parse(new TextDecoder().decode(buffer)));
    if ((universe && universe !== result.universeId) || (total !== undefined && total !== result.total)) throw new Error('UNIVERSE_CHANGED');
    universe = result.universeId; total = result.total;
    for (const fact of result.items) {
      if (!fact.instrument || !isFresh(fact)) continue;
      const id = fact.instrument.assetId;
      const previous = records.get(id);
      if (!previous || previous.observedAt < fact.observedAt) records.set(id, fact);
    }
    if (!result.nextCursor) return [...records.values()];
    if (!result.nextCursor.startsWith(universe + ':') || Number(result.nextCursor.split(':')[1]) <= (cursor ? Number(cursor.split(':')[1]) : 0)) throw new Error('INVALID_CURSOR');
    cursor = result.nextCursor;
  }
  throw new Error('SNAPSHOT_PAGE_LIMIT');
}

export function startMarketDelivery(onRecords: (records: Quote[]) => void, options: {
  fetchImpl?: typeof fetch; createStream?: () => EventSource;
} = {}) {
  let stopped = false, stream: EventSource | undefined, controller: AbortController | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined, failures = 0, generation = 0;
  let records = new Map<string, Quote>(), buffered = new Map<string, Quote>();
  let loading = false;
  function publish() {
    for (const [id, r] of records) if (!isFresh(r)) records.delete(id);
    onRecords([...records.values()]);
  }
  function merge(record: Quote, target: Map<string, Quote>) {
    if (!record.instrument || !isFresh(record)) return;
    const id = record.instrument.assetId, old = target.get(id);
    if (!old && target.size >= 9000) throw new Error('DELTA_CAPACITY');
    if (!old || old.observedAt <= record.observedAt) target.set(id, record);
  }
  async function snapshot() {
    if (stopped || loading) return;
    loading = true; buffered.clear();
    const active = new AbortController(); controller = active;
    const current = generation;
    try {
      const next = await loadMarketSnapshot(active.signal, options.fetchImpl || fetch);
      if (stopped || active.signal.aborted || current !== generation) return;
      const combined = new Map<string, Quote>();
      next.forEach(r => merge(r, combined)); buffered.forEach(r => merge(r, combined));
      records = combined; publish();
    } catch { /* Only fresh existing evidence survives a transient snapshot failure. */ }
    finally { if (current === generation) { loading = false; buffered.clear(); } }
  }
  function schedule() {
    if (stopped || retry) return;
    stream?.close(); stream = undefined;
    retry = setTimeout(() => { retry = undefined; connect(); }, Math.min(60000, 5000 * 2 ** Math.min(failures++, 4)) + Math.random() * 1000);
  }
  function connect() {
    if (stopped) return;
    generation++; controller?.abort(); loading = false; buffered.clear();
    try {
      const current = options.createStream ? options.createStream() : new EventSource('/api/market/events');
      stream = current;
      current.addEventListener('reset', () => {
        if (stream !== current || stopped) return;
        failures = 0; void snapshot();
      });
      current.addEventListener('quote', (event: MessageEvent) => {
        if (stream !== current || stopped) return;
        try {
          if (event.data.length > 8192) throw new Error('DELTA_TOO_LARGE');
          merge(QuoteDeliverySchema.parse(JSON.parse(event.data)), loading ? buffered : records);
          if (!loading) publish();
        } catch { schedule(); }
      });
      current.onerror = () => { if (stream === current) schedule(); };
    } catch { schedule(); }
    void snapshot(); // REST fallback also works before or without an SSE handshake.
  }
  const expiry = setInterval(publish, 1000);
  connect();
  return () => {
    stopped = true; generation++; clearTimeout(retry); clearInterval(expiry);
    controller?.abort(); stream?.close(); records.clear(); buffered.clear();
  };
}

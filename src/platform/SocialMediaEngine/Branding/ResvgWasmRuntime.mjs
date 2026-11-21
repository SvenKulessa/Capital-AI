/** One instance of @resvg/resvg-wasm per Node process, shared by all offline renderers.
 * A cached rejection remains a failure; callers must not bypass corrupted initialization.
 */
import { readFile } from 'node:fs/promises';
import { initWasm } from '@resvg/resvg-wasm';

let initialization;
export function ensureResvgWasmInitialized() {
  initialization ??= readFile(new URL(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm')))
    .then(bytes => initWasm(bytes));
  return initialization;
}

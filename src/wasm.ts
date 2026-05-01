import * as nodePath from 'path';
import * as fs from 'fs';

type WasmIndexType = any;
type WasmModule = any;
let wasmModule: WasmModule | null = null;
let wasmLoadAttempted = false;

export async function loadWasm(): Promise<WasmModule | null> {
  if (wasmLoadAttempted) return wasmModule;
  wasmLoadAttempted = true;

  const isBrowser = typeof (globalThis as { window?: unknown }).window !== 'undefined';
  if (isBrowser) {
    console.warn('[SolVec] WASM unavailable in browser context, using JS fallback');
    return null;
  }

  // Vercel production — load WASM binary directly via fs + WebAssembly API
  // Avoids dynamic require() which Turbopack rejects
  if (process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL) {
    try {
      const wasmBinaryPath = nodePath.join(process.cwd(), 'wasm', 'solvec_wasm_bg.wasm');
      const wasmBinary = fs.readFileSync(wasmBinaryPath);
      const parts = [process.cwd(), 'wasm', 'solvec_wasm'];
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const glue = require(parts.join(nodePath.sep)) as WasmModule;
      const wasmInstance = await WebAssembly.instantiate(wasmBinary, glue.__wbindgen_placeholder__ ?? {});
      glue.__wbg_init?.(wasmInstance);
      wasmModule = glue;
      console.log('[SolVec] Rust HNSW engine loaded (Vercel)');
    } catch (e) {
      console.warn('[SolVec] WASM unavailable on Vercel, using JS fallback:', e);
      wasmModule = null;
    }
    return wasmModule;
  }

  // Local Node.js
  try {
    const segments = ['..', 'wasm', 'solvec_wasm'];
    const pkgPath = segments.join('/');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    wasmModule = require(pkgPath) as WasmModule;
    console.log('[SolVec] Rust HNSW engine loaded via WASM (local Node.js)');
  } catch (e) {
    console.warn('[SolVec] WASM unavailable, using JS fallback:', e);
    wasmModule = null;
  }
  return wasmModule;
}

export function getWasm(): WasmModule | null {
  return wasmModule;
}
export type { WasmIndexType };
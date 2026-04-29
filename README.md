# recall-sdk-js

TypeScript / JavaScript SDK for [VecLabs Recall](https://github.com/veclabs/recall) — decentralized vector memory for AI agents.

[![npm](https://img.shields.io/badge/npm-%40veclabs%2Fsolvec-orange.svg)](https://www.npmjs.com/package/@veclabs/solvec)
[![Version](https://img.shields.io/badge/version-0.1.0--alpha.9-blue.svg)]()
[![Tests](https://img.shields.io/badge/tests-27%20passing-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Install

```bash
npm install @veclabs/solvec
```

---

## Quick Start

```typescript
import { SolVec } from '@veclabs/solvec';

const sv = new SolVec({ apiKey: 'your-api-key' });
const collection = sv.collection('agent-memory', { dimensions: 1536 });

// Upsert vectors
await collection.upsert([{
  id: 'mem_001',
  values: [...],
  metadata: { text: 'User prefers dark mode' }
}]);

// Query
const results = await collection.query({ vector: [...], topK: 5 });

// Verify collection integrity against on-chain Merkle root
const proof = await collection.verify();
console.log(proof.solanaExplorerUrl);
```

---

## Authentication

Get an API key at [app.veclabs.xyz](https://app.veclabs.xyz).

```typescript
const sv = new SolVec({ apiKey: process.env.RECALL_API_KEY });
```

**Self-hosted with Shadow Drive** (bring your own Solana wallet):

```typescript
const sv = new SolVec({
  network: 'devnet',
  wallet: '/path/to/keypair.json',
  shadowDrive: true
});
```

---

## API Reference

### `sv.collection(name, options?)`

Returns a collection handle. Creates the collection on first write.

```typescript
const collection = sv.collection('my-collection', {
  dimensions: 1536   // required on first write, inferred after
});
```

### `collection.upsert(vectors)`

Insert or update vectors. Each vector requires `id` and `values`. `metadata` is optional.

```typescript
await collection.upsert([
  { id: 'v1', values: [...], metadata: { source: 'gpt-4' } },
  { id: 'v2', values: [...] }
]);
```

After every upsert, a SHA-256 Merkle root of all vector IDs is posted to the Solana Anchor program on-chain.

### `collection.query(params)`

Nearest-neighbor search. Returns top-k results with scores and metadata.

```typescript
const results = await collection.query({
  vector: [...],
  topK: 10,               // default: 10
  includeMetadata: true,  // default: true
  includeValues: false    // default: false
});

// results.matches: [{ id, score, metadata }]
```

Supports `cosine` (default), `euclidean`, and `dot` distance metrics.

### `collection.delete(ids)`

Delete vectors by ID.

```typescript
await collection.delete(['v1', 'v2']);
```

### `collection.verify()`

Fetches the on-chain Merkle root from Solana and verifies it against the current collection state. Returns a proof object with a Solana Explorer URL.

```typescript
const proof = await collection.verify();
// proof.valid: boolean
// proof.onChainRoot: string
// proof.computedRoot: string
// proof.solanaExplorerUrl: string
```

### `collection.stats()`

Returns collection statistics.

```typescript
const stats = await collection.stats();
// stats.vectorCount: number
// stats.dimensions: number
// stats.merkleRoot: string
```

---

## Memory Inspector

The SDK ships with a Memory Inspector for debugging agent memory state:

```typescript
import { MemoryInspector } from '@veclabs/solvec';

const inspector = new MemoryInspector(collection);
const result = await inspector.inspect('mem_001');
// result.record: MemoryRecord
// result.merkleProof: string[]
// result.verified: boolean
```

Web component for visual inspection:

```bash
npm install @veclabs/inspector-ui
```

```html
<script type="module" src="node_modules/@veclabs/inspector-ui/dist/inspector.js"></script>
<recall-inspector api-key="your-key" collection="agent-memory"></recall-inspector>
```

---

## Migrating from Pinecone

The API is intentionally shaped to match Pinecone's client. Migration is three line changes:

```typescript
// Before
import { Pinecone } from '@pinecone-database/pinecone';
const pc = new Pinecone({ apiKey: 'YOUR_KEY' });
const index = pc.index('my-index');

// After
import { SolVec } from '@veclabs/solvec';
const sv = new SolVec({ apiKey: 'YOUR_KEY' });
const index = sv.collection('my-index');

// Everything below stays identical
await index.upsert({ vectors: [...] });
await index.query({ vector: [...], topK: 10 });
await index.verify();  // new — Pinecone has no equivalent
```

---

## Status

| Feature                  | Status                          |
| ------------------------ | ------------------------------- |
| Hosted API (api key mode)| ✅ Live                         |
| Shadow Drive (self-host) | ✅ Available — `shadowDrive: true` |
| Merkle verification      | ✅ Complete                     |
| Memory Inspector         | ✅ Shipped (Phase 6)            |
| WASM Rust bridge         | 🔄 In progress (JS fallback now)|
| LangChain integration    | 📋 Planned                      |
| LlamaIndex integration   | 📋 Planned                      |

---

## Related

- **Rust core engine** → [`veclabs/recall`](https://github.com/veclabs/recall)
- **Python SDK** → [`veclabs/recall-sdk-python`](https://github.com/veclabs/recall-sdk-python)
- **Hosted API** → [api.veclabs.xyz](https://api.veclabs.xyz)
- **Dashboard** → [app.veclabs.xyz](https://app.veclabs.xyz)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Priority: LangChain integration, AutoGen integration, additional framework adapters.

---

## License

MIT. See [LICENSE](LICENSE).

---

[veclabs.xyz](https://veclabs.xyz) · [@veclabs](https://x.com/veclabs46369) · [Discord](https://discord.gg/veclabs)

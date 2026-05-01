import { VectorStore } from "@langchain/core/vectorstores";
import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";
import { SolVec } from "@veclabs/solvec";

export interface RecallVectorStoreArgs {
  apiKey: string;
  collection: string;
  embeddings: Embeddings;
  dimensions?: number;
  metric?: "cosine" | "euclidean" | "dot";
  apiUrl?: string;
}

/**
 * LangChain VectorStore backed by Recall by VecLabs.
 *
 * Every write produces a SHA-256 Merkle root.
 * On Pro and above, vectors are stored permanently on Arweave via Irys
 * and the Merkle root is posted to Solana on every write.
 *
 * Usage:
 *   import { RecallVectorStore } from "@veclabs/solvec/langchain";
 *   import { OpenAIEmbeddings } from "@langchain/openai";
 *
 *   const store = await RecallVectorStore.fromTexts(
 *     ["User prefers dark mode", "Meeting at 3pm"],
 *     [{ source: "chat" }, { source: "calendar" }],
 *     new OpenAIEmbeddings(),
 *     { apiKey: "vl_live_...", collection: "langchain-memory" }
 *   );
 *
 *   const docs = await store.similaritySearch("user preferences", 3);
 */
export class RecallVectorStore extends VectorStore {
  private _collection: ReturnType<InstanceType<typeof SolVec>["collection"]>;
  private _embeddings: Embeddings;

  _vectorstoreType(): string {
    return "recall";
  }

  constructor(embeddings: Embeddings, args: RecallVectorStoreArgs) {
    super(embeddings, args);
    this._embeddings = embeddings;
    const config: any = { apiKey: args.apiKey };
if (args.apiUrl) config.apiUrl = args.apiUrl;
const sv = new SolVec(config);
    this._collection = sv.collection(args.collection, {
      dimensions: args.dimensions ?? 1536,
      metric: args.metric ?? "cosine",
    });
  }

  // ── Required VectorStore interface ─────────────────────────────────────

  async addVectors(
    vectors: number[][],
    documents: Document[],
    options?: { ids?: string[] }
  ): Promise<string[]> {
    const ids = options?.ids ?? documents.map(() => crypto.randomUUID());

    const records = vectors.map((values, i) => ({
      id: ids[i],
      values,
      metadata: {
        ...documents[i].metadata,
        text: documents[i].pageContent,
      },
    }));

    await this._collection.upsert(records);
    return ids;
  }

  async addDocuments(
    documents: Document[],
    options?: { ids?: string[] }
  ): Promise<string[]> {
    const texts = documents.map((d) => d.pageContent);
    const vectors = await this._embeddings.embedDocuments(texts);
    return this.addVectors(vectors, documents, options);
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: Record<string, any>
  ): Promise<[Document, number][]> {
    const results = await this._collection.query({
      vector: query,
      topK: k,
      filter,
      includeMetadata: true,
    });

    return results.matches.map((match: any) => {
      const { text, ...metadata } = match.metadata ?? {};
      return [
        new Document({ pageContent: text ?? "", metadata }),
        match.score,
      ];
    });
  }

  // ── Static constructors ─────────────────────────────────────────────────

  static async fromTexts(
    texts: string[],
    metadatas: Record<string, any>[] | Record<string, any>,
    embeddings: Embeddings,
    args: RecallVectorStoreArgs
  ): Promise<RecallVectorStore> {
    const store = new RecallVectorStore(embeddings, args);
    const metadatasArray = Array.isArray(metadatas)
      ? metadatas
      : texts.map(() => metadatas);

    const documents = texts.map(
      (text, i) => new Document({ pageContent: text, metadata: metadatasArray[i] ?? {} })
    );

    await store.addDocuments(documents);
    return store;
  }

  static async fromDocuments(
    documents: Document[],
    embeddings: Embeddings,
    args: RecallVectorStoreArgs
  ): Promise<RecallVectorStore> {
    const store = new RecallVectorStore(embeddings, args);
    await store.addDocuments(documents);
    return store;
  }

  // ── Recall-specific ─────────────────────────────────────────────────────

  /** Verify collection integrity against on-chain Merkle root (Pro and above). */
  async verify() {
    return this._collection.verify();
  }
}
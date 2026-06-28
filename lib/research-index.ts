// Client-side semantic index for all research items.
// Built from RESEARCH_CATALOG on first load, then enriched with user tags and AI analysis.

const DB_NAME = 'av-research-index'
const DB_VERSION = 1
const STORE_NAME = 'research'
const TAG_STORE = 'tags'
const CONTEXT_STORE = 'contexts'

export type ResearchCategory =
  | "AI/ML"
  | "Blockchain/Governance"
  | "Transformers/Architecture"
  | "Consciousness/Philosophy"
  | "Tokenomics"
  | "Security"
  | "Uncategorized";

export type ResearchSource = "IPFS" | "HuggingFace" | "GitHub" | "Local" | "Enterprise";

export interface ResearchItem {
  id: string;
  title: string;
  cid?: string;
  hfModel?: string;
  hfDataset?: string;
  ghRepo?: string;
  localPath?: string;
  category: ResearchCategory;
  tags: string[];
  summary: string;
  source: ResearchSource;
  date: string;
  relatedIds: string[];
  importance: number;
  contextLayers?: string[];
  context?: {
    field: string;
    domain: string;
    specificTopic: string;
  };
  author?: string;
  url?: string;
}

export interface IndexedResearchItem extends ResearchItem {
  indexedAt: number;
  userTags: string[];
  aiTags: string[];
  semanticScore: number;
  colorCode: string;
  searchableText: string;
}

export interface TagIndexEntry {
  tag: string;
  itemIds: string[];
}

export interface ContextIndexEntry {
  path: string;
  itemIds: string[];
}

// Color coding by category
export const CATEGORY_COLORS: Record<ResearchCategory, string> = {
  "AI/ML": "#3B82F6",           // blue
  "Blockchain/Governance": "#10B981", // green
  "Transformers/Architecture": "#8B5CF6", // purple
  "Consciousness/Philosophy": "#F59E0B", // gold
  "Tokenomics": "#F97316",      // orange
  "Security": "#EF4444",        // red
  "Uncategorized": "#6B7280",   // gray
};

function getColorCode(category: ResearchCategory, importance: number): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["Uncategorized"];
}

function generateAiTags(item: ResearchItem): string[] {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const tags: string[] = [];

  const AI_TAG_KEYWORDS: Record<string, string[]> = {
    "neural": ["neural", "neuron", "deep learning"],
    "transformer": ["transformer", "attention", "self-attention"],
    "blockchain": ["blockchain", "ledger", "on-chain"],
    "governance": ["governance", "dao", "voting"],
    "consciousness": ["consciousness", "awareness", "sentience"],
    "optimization": ["optimization", "gradient", "convergence"],
    "tokenomics": ["tokenomics", "token", "incentive", "supply"],
    "security": ["security", "attack", "vulnerability", "privacy"],
    "distillation": ["distillation", "knowledge transfer"],
    "quantization": ["quantiz", "int8", "int4"],
    "multimodal": ["multimodal", "cross-modal", "vision-language"],
    "time-series": ["time series", "temporal", "sequence"],
    "benchmark": ["benchmark", "evaluation", "metric"],
    "architecture": ["architecture", "design", "framework"],
    "theory": ["theory", "theorem", "proof", "formal"],
    "simulation": ["simulation", "simulator", "environment"],
    "nlp": ["nlp", "natural language", "text mining"],
    "computer-vision": ["vision", "image", "visual"],
  };

  for (const [tag, keywords] of Object.entries(AI_TAG_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags.slice(0, 4);
}

function calculateSemanticScore(item: ResearchItem): number {
  let score = item.importance / 100;
  if (item.cid) score += 0.1;
  if (item.tags.length > 3) score += 0.05;
  if (item.relatedIds.length > 2) score += 0.1;
  return Math.min(1, score);
}

let db: IDBDatabase | null = null;

export function initDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('source', 'source', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('importance', 'importance', { unique: false });
      }

      if (!database.objectStoreNames.contains(TAG_STORE)) {
        const tagStore = database.createObjectStore(TAG_STORE, { keyPath: 'tag' });
        tagStore.createIndex('itemIds', 'itemIds', { unique: false, multiEntry: true });
      }

      if (!database.objectStoreNames.contains(CONTEXT_STORE)) {
        const ctxStore = database.createObjectStore(CONTEXT_STORE, { keyPath: 'path' });
        ctxStore.createIndex('itemIds', 'itemIds', { unique: false, multiEntry: true });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function buildFullIndex(catalog: ResearchItem[]): Promise<number> {
  const database = await initDB();
  const transaction = database.transaction([STORE_NAME, TAG_STORE, CONTEXT_STORE], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const tagStore = transaction.objectStore(TAG_STORE);
  const ctxStore = transaction.objectStore(CONTEXT_STORE);

  store.clear();
  tagStore.clear();
  ctxStore.clear();

  const tagMap: Record<string, string[]> = {};
  const contextMap: Record<string, string[]> = {};

  for (const item of catalog) {
    const searchableText = [
      item.title,
      item.summary,
      ...item.tags,
      item.category,
      item.source,
    ].join(' ').toLowerCase();

    const contextLayers = item.contextLayers || [item.category];

    const colorCode = getColorCode(item.category, item.importance);

    const indexedItem: IndexedResearchItem = {
      ...item,
      indexedAt: Date.now(),
      userTags: [],
      aiTags: generateAiTags(item),
      semanticScore: calculateSemanticScore(item),
      colorCode,
      searchableText,
    };

    store.put(indexedItem);

    const allTags = [...item.tags, ...indexedItem.aiTags, item.category, item.source];
    for (const tag of allTags) {
      const normalizedTag = tag.toLowerCase();
      if (!tagMap[normalizedTag]) tagMap[normalizedTag] = [];
      tagMap[normalizedTag].push(item.id);
    }

    for (let i = 1; i <= contextLayers.length; i++) {
      const path = contextLayers.slice(0, i).join('/');
      if (!contextMap[path]) contextMap[path] = [];
      contextMap[path].push(item.id);
    }
  }

  for (const [tag, itemIds] of Object.entries(tagMap)) {
    tagStore.put({ tag, itemIds } as TagIndexEntry);
  }

  for (const [path, itemIds] of Object.entries(contextMap)) {
    ctxStore.put({ path, itemIds } as ContextIndexEntry);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(catalog.length);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function search(query: string): Promise<IndexedResearchItem[]> {
  const database = await initDB();
  const store = database.transaction(STORE_NAME).objectStore(STORE_NAME);
  const items: IndexedResearchItem[] = [];

  return new Promise((resolve, reject) => {
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (!cursor) {
        resolve(items);
        return;
      }

      const item = cursor.value as IndexedResearchItem;
      if (!query) {
        items.push(item);
      } else {
        const q = query.toLowerCase();
        if (item.searchableText?.includes(q) || item.title.toLowerCase().includes(q)) {
          items.push(item);
        }
      }

      cursor.continue();
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getByCategory(category: ResearchCategory): Promise<IndexedResearchItem[]> {
  const database = await initDB();
  const store = database.transaction(STORE_NAME).objectStore(STORE_NAME);
  const index = store.index('category');

  return new Promise((resolve, reject) => {
    const request = index.getAll(category);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getByTag(tag: string): Promise<IndexedResearchItem[]> {
  const database = await initDB();
  const tagStore = database.transaction(TAG_STORE).objectStore(TAG_STORE);

  return new Promise((resolve, reject) => {
    const request = tagStore.get(tag.toLowerCase());
    request.onsuccess = () => {
      const entry = request.result as TagIndexEntry | undefined;
      if (!entry || !entry.itemIds) {
        resolve([]);
        return;
      }
      const store = database.transaction(STORE_NAME).objectStore(STORE_NAME);
      const items: IndexedResearchItem[] = [];
      let remaining = entry.itemIds.length;

      if (remaining === 0) {
        resolve([]);
        return;
      }

      for (const id of entry.itemIds) {
        const itemRequest = store.get(id);
        itemRequest.onsuccess = () => {
          if (itemRequest.result) items.push(itemRequest.result);
          remaining--;
          if (remaining === 0) resolve(items);
        };
        itemRequest.onerror = () => {
          remaining--;
          if (remaining === 0) resolve(items);
        };
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getRelated(itemId: string): Promise<IndexedResearchItem[]> {
  const all = await search('')
  const item = all.find(i => i.id === itemId)
  if (!item || !item.relatedIds.length) return []
  return all.filter(i => item.relatedIds.includes(i.id))
}

export async function getContextPathway(itemId: string): Promise<IndexedResearchItem[]> {
  const all = await search('')
  const item = all.find(i => i.id === itemId)
  if (!item) return []

  // Build a pathway: the item itself followed by items referenced by relatedIds
  const pathway: IndexedResearchItem[] = [item]

  if (item.relatedIds && item.relatedIds.length > 0) {
    for (const relatedId of item.relatedIds) {
      const related = all.find(i => i.id === relatedId)
      if (related) pathway.push(related)
    }
  }

  return pathway
}

export async function getAll(): Promise<IndexedResearchItem[]> {
  return search('');
}

export async function clearIndex(): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction([STORE_NAME, TAG_STORE, CONTEXT_STORE], 'readwrite');
  transaction.objectStore(STORE_NAME).clear();
  transaction.objectStore(TAG_STORE).clear();
  transaction.objectStore(CONTEXT_STORE).clear();
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

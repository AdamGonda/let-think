export const SEARCH_EMBEDDING_DIMENSIONS = 768;
export const SEARCH_SNIPPET_MAX = 180;
export const SEARCH_EMBED_TEXT_MAX = 8000;
export const SEARCH_MIN_QUERY_LENGTH = 2;

export type SearchKind = "note" | "chat" | "idea";

export type ConceptGraphSlice = {
  nodes: Array<{ id: string; name: string; description?: string }>;
  batches?: Array<{ id: string; nodeIds: string[] }>;
};

export function noteSourceKey(fileId: string): string {
  return `note:${fileId}`;
}

export function chatSourceKey(messageId: string): string {
  return `chat:${messageId}`;
}

export function ideaSourceKey(sessionId: string, nodeId: string): string {
  return `idea:${sessionId}:${nodeId}`;
}

export function hashContent(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function makeSnippet(text: string, max = SEARCH_SNIPPET_MAX): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function clipEmbeddingText(text: string): string {
  if (text.length <= SEARCH_EMBED_TEXT_MAX) return text;
  return text.slice(0, SEARCH_EMBED_TEXT_MAX);
}

export function noteEmbeddingHash(text: string): string {
  return hashContent(clipEmbeddingText(text));
}

/** Drop delayed embed jobs whose snapshot is no longer what's on the file. */
export function isScheduledNoteEmbedCurrent(
  currentNotes: string,
  scheduledHash: string,
): boolean {
  return noteEmbeddingHash(currentNotes) === scheduledHash;
}

export function ideaEmbeddingText(node: {
  name: string;
  description?: string;
}): string {
  const name = node.name.trim();
  const description = node.description?.trim();
  return description ? `${name}\n${description}` : name;
}

export function hasReadyEmbedding(embedding: number[] | undefined): boolean {
  return embedding != null && embedding.length === SEARCH_EMBEDDING_DIMENSIONS;
}

/** Skip Google when hash is unchanged. `retryPending` re-queues rows that never got a vector. */
export function shouldEnqueueEmbed(
  existing: { contentHash: string; embedding?: number[] } | null,
  contentHash: string,
  retryPending: boolean,
): boolean {
  if (!existing) return true;
  if (existing.contentHash !== contentHash) return true;
  if (hasReadyEmbedding(existing.embedding)) return false;
  return retryPending;
}

export function batchIdForNode(
  graph: ConceptGraphSlice,
  nodeId: string,
): string | undefined {
  const batches = graph.batches;
  if (!batches) return undefined;
  for (let i = batches.length - 1; i >= 0; i -= 1) {
    const batch = batches[i];
    if (batch?.nodeIds.includes(nodeId)) return batch.id;
  }
  return undefined;
}

export function batchIndexForId(
  batches: Array<{ id: string }> | undefined,
  batchId: string | undefined,
): number | null {
  if (!batches?.length || !batchId) return null;
  const i = batches.findIndex((b) => b.id === batchId);
  return i >= 0 ? i : null;
}

export function removedIdeaNodeIds(
  existingNodeIds: string[],
  currentNodeIds: Set<string>,
): string[] {
  return existingNodeIds.filter((id) => !currentNodeIds.has(id));
}

const SEARCH_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "this",
  "that",
  "with",
  "from",
  "was",
  "have",
  "has",
]);

/** Floor for cosine similarity when the text does not contain query terms. */
export const SEARCH_MIN_SEMANTIC_SCORE = 0.62;
/** Semantic-only hits must also stay close to the best neighbor. */
export const SEARCH_SEMANTIC_SCORE_GAP = 0.12;

export function queryTerms(query: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of query.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 3 || SEARCH_STOPWORDS.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    terms.push(raw);
  }
  return terms;
}

export function matchingTerms(text: string, terms: string[]): string[] {
  if (terms.length === 0) return [];
  const hay = text.toLowerCase();
  return terms.filter((term) => hay.includes(term));
}

export function snippetAroundMatch(
  text: string,
  terms: string[],
  max = SEARCH_SNIPPET_MAX,
): string {
  const collapsed = text.trim().replace(/\s+/g, " ");
  if (!collapsed) return "";
  if (terms.length === 0) return makeSnippet(collapsed, max);
  const lower = collapsed.toLowerCase();
  let idx = -1;
  for (const term of terms) {
    const at = lower.indexOf(term);
    if (at >= 0 && (idx < 0 || at < idx)) idx = at;
  }
  if (idx < 0) return makeSnippet(collapsed, max);
  const start = Math.max(0, idx - Math.floor(max / 4));
  let slice = collapsed.slice(start, start + max);
  if (start > 0) slice = `…${slice}`;
  if (start + max < collapsed.length) slice = `${slice.trimEnd()}…`;
  return slice;
}

export function explainSearchHit(
  query: string,
  title: string,
  body: string,
): {
  reason: "contains" | "similar";
  matchedTerms: string[];
  snippet: string;
} {
  const terms = queryTerms(query);
  const matchedTerms = matchingTerms(`${title}\n${body}`, terms);
  return {
    reason: matchedTerms.length > 0 ? "contains" : "similar",
    matchedTerms,
    snippet: snippetAroundMatch(body || title, matchedTerms),
  };
}

export function shouldKeepSearchHit(args: {
  score: number;
  matchedTerms: string[];
  bestScore: number;
}): boolean {
  if (args.matchedTerms.length > 0) return true;
  if (args.score < SEARCH_MIN_SEMANTIC_SCORE) return false;
  return args.score >= args.bestScore - SEARCH_SEMANTIC_SCORE_GAP;
}

export function searchHitReasonLabel(
  reason: "contains" | "similar",
  matchedTerms: string[],
): string {
  if (reason === "similar" || matchedTerms.length === 0) {
    return "Similar meaning";
  }
  const shown = matchedTerms.slice(0, 3).map((term) => `“${term}”`);
  const extra = matchedTerms.length > 3 ? "…" : "";
  return `Contains ${shown.join(", ")}${extra}`;
}

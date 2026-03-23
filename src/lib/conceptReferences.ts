/** Match @1, @2, … word boundaries (same semantics as chat input parsing). */
export const AT_REFERENCE_PATTERN = String.raw`@(\d+)\b`;

export type NumberedConcept = {
  id: string;
  name: string;
  description?: string;
  number: number;
};

export function conceptByNumberMap(
  concepts: NumberedConcept[],
): Map<number, NumberedConcept> {
  return new Map(concepts.map((c) => [c.number, c]));
}

type ConceptGraphLike = {
  nodes: Array<{ id: string; name: string; description?: string }>;
} | null;

type BatchLike = { nodeIds?: string[] };

export function buildNumberedConceptsFromGraph(
  conceptGraph: ConceptGraphLike | undefined,
  batches: BatchLike[],
  selectedBatchIndex: number,
): NumberedConcept[] {
  if (!conceptGraph?.nodes) return [];
  const batch = batches[selectedBatchIndex];
  if (!batch?.nodeIds?.length) return [];
  const nodeMap = new Map(conceptGraph.nodes.map((n) => [n.id, n]));
  const result: NumberedConcept[] = [];
  for (let i = 0; i < batch.nodeIds.length; i++) {
    const node = nodeMap.get(batch.nodeIds[i]!);
    if (node) result.push({ ...node, number: i + 1 });
  }
  return result;
}

export function referencedConceptIdsFromDraft(
  draftInput: string | undefined,
  numberedConcepts: NumberedConcept[],
  isLatestBatch: boolean,
): Set<string> {
  if (!isLatestBatch) return new Set<string>();
  const ids = new Set<string>();
  const conceptByNumber = conceptByNumberMap(numberedConcepts);
  const refRegex = new RegExp(AT_REFERENCE_PATTERN, "g");
  let m: RegExpExecArray | null;
  while ((m = refRegex.exec(draftInput ?? "")) !== null) {
    const concept = conceptByNumber.get(parseInt(m[1]!, 10));
    if (concept) ids.add(concept.id);
  }
  return ids;
}

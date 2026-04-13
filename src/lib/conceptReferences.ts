/** Match @1, @2, … word boundaries (same semantics as chat input parsing). */
export const AT_REFERENCE_PATTERN = String.raw`@(\d+)\b`;

/**
 * When Backspace removes the character before `cursor`, if that would delete part of an
 * `@n` token, returns the full range to remove instead (the token, and a single following
 * space if the cursor sits right after that space).
 */
export function backspaceRemoveAtReferenceRange(
  value: string,
  cursor: number,
): { start: number; end: number } | null {
  if (cursor <= 0) return null;

  if (value[cursor - 1] === " ") {
    const beforeSpace = value.slice(0, cursor - 1);
    const m = beforeSpace.match(new RegExp(AT_REFERENCE_PATTERN + "$"));
    if (m) {
      const tokenStart = beforeSpace.length - m[0].length;
      return { start: tokenStart, end: cursor };
    }
  }

  const refRegex = new RegExp(AT_REFERENCE_PATTERN, "g");
  let match: RegExpExecArray | null;
  while ((match = refRegex.exec(value)) !== null) {
    const matchEnd = match.index + match[0].length;
    if (matchEnd === cursor) {
      return { start: match.index, end: cursor };
    }
  }
  return null;
}

/** When Delete removes at `cursor`, if an `@n` starts there, remove the whole token. */
export function deleteForwardRemoveAtReferenceRange(
  value: string,
  cursor: number,
): { start: number; end: number } | null {
  if (cursor >= value.length) return null;
  const rest = value.slice(cursor);
  const m = rest.match(new RegExp("^" + AT_REFERENCE_PATTERN));
  if (!m) return null;
  return { start: cursor, end: cursor + m[0].length };
}

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

/** Append `@n` to the draft (with a trailing space so typing continues after the ref), with a leading space before `@` when needed. */
export function appendAtReferenceToDraft(
  draft: string | undefined,
  n: number,
): string {
  const d = draft ?? "";
  const token = `@${n} `;
  if (d.length === 0) return token;
  if (/\s$/.test(d)) return d + token;
  return `${d} ${token}`;
}

/** Remove every `@n` token (same `\b` rules as {@link AT_REFERENCE_PATTERN}). */
function removeAtReferenceTokensFromDraft(draft: string, n: number): string {
  const re = new RegExp(String.raw`@${n}\b`, "g");
  let s = draft.replace(re, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

/** If `@n` is already in the draft, strip it; otherwise append it (like {@link appendAtReferenceToDraft}). */
export function toggleAtReferenceInDraft(
  draft: string | undefined,
  n: number,
): string {
  const d = draft ?? "";
  if (new RegExp(String.raw`@${n}\b`).test(d)) {
    return removeAtReferenceTokensFromDraft(d, n);
  }
  return appendAtReferenceToDraft(d, n);
}

/** True if another concept number shares the same digit prefix (e.g. `1` vs `10`, `11`). */
function couldBePrefixOfLongerConceptNumber(
  n: number,
  conceptNumbers: number[],
): boolean {
  const prefix = String(n);
  for (const k of conceptNumbers) {
    if (k === n) continue;
    if (String(k).startsWith(prefix)) return true;
  }
  return false;
}

/**
 * After each `@n` that resolves to a current concept, insert a space if the next character
 * is missing or non-whitespace (same `@n` detection as {@link AT_REFERENCE_PATTERN}).
 * Does not insert when `@n` could still be extended (e.g. typing `@10` after `@1`).
 */
export function ensureSpaceAfterValidAtReferences(
  value: string,
  numberedConcepts: NumberedConcept[],
): string {
  if (numberedConcepts.length === 0) return value;
  const conceptByNumber = conceptByNumberMap(numberedConcepts);
  const conceptNumbers = [...conceptByNumber.keys()];
  const refRegex = new RegExp(AT_REFERENCE_PATTERN, "g");
  let out = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = refRegex.exec(value)) !== null) {
    const num = parseInt(m[1]!, 10);
    const end = m.index + m[0]!.length;
    out += value.slice(lastIndex, end);
    lastIndex = end;
    if (conceptByNumber.has(num)) {
      if (couldBePrefixOfLongerConceptNumber(num, conceptNumbers)) {
        continue;
      }
      const after = value[end];
      if (after === undefined || !/\s/.test(after)) {
        out += " ";
      }
    }
  }
  out += value.slice(lastIndex);
  return out;
}

export function referencedConceptIdsFromDraft(
  draftInput: string | undefined,
  numberedConcepts: NumberedConcept[],
): Set<string> {
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

/** Match @1, @writing, @graph at word boundaries (same semantics as chat input parsing). */
export const AT_REFERENCE_PATTERN = String.raw`@(\d+|writing|graph)\b`;

export const WRITING_REF_TOKEN = "writing";
export const GRAPH_REF_TOKEN = "graph";
export const WRITING_REF_ID = "__writing__";
export const GRAPH_REF_ID = "__graph__";
export const WRITING_REF_NAME = "Writing";
export const GRAPH_REF_NAME = "Graph";

export type NamedAtRef = {
  token: typeof WRITING_REF_TOKEN | typeof GRAPH_REF_TOKEN;
  id: string;
  name: string;
};

export function namedAtRef(capture: string): NamedAtRef | null {
  if (capture === WRITING_REF_TOKEN) {
    return { token: WRITING_REF_TOKEN, id: WRITING_REF_ID, name: WRITING_REF_NAME };
  }
  if (capture === GRAPH_REF_TOKEN) {
    return { token: GRAPH_REF_TOKEN, id: GRAPH_REF_ID, name: GRAPH_REF_NAME };
  }
  return null;
}

export type AtMentionOption = {
  token: string;
  label: string;
  kind: "writing" | "graph" | "concept";
};

/** Open `@query` at the caret, or null if not in a mention. */
export function atQueryAtCaret(
  value: string,
  caret: number,
): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && /[A-Za-z0-9_]/.test(before[at - 1]!)) return null;
  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { start: at, query };
}

export function insertAtMentionToken(
  value: string,
  queryStart: number,
  caret: number,
  token: string,
): { value: string; caret: number } {
  const inserted = `@${token} `;
  const next = value.slice(0, queryStart) + inserted + value.slice(caret);
  return { value: next, caret: queryStart + inserted.length };
}

export function atMentionOptions(args: {
  query: string;
  numberedConcepts: NumberedConcept[];
  allowGraphRef: boolean;
}): AtMentionOption[] {
  const q = args.query.toLowerCase();
  const items: AtMentionOption[] = [
    { token: WRITING_REF_TOKEN, label: WRITING_REF_NAME, kind: "writing" },
  ];
  if (args.allowGraphRef) {
    items.push({
      token: GRAPH_REF_TOKEN,
      label: GRAPH_REF_NAME,
      kind: "graph",
    });
  }
  for (const c of args.numberedConcepts) {
    items.push({
      token: String(c.number),
      label: c.name,
      kind: "concept",
    });
  }
  if (!q) return items;
  return items.filter(
    (item) =>
      item.token.toLowerCase().startsWith(q) ||
      item.label.toLowerCase().includes(q),
  );
}

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

function hasAtReference(draft: string, n: number): boolean {
  return new RegExp(String.raw`@${n}\b`).test(draft);
}

/** Remove every `@n` token (same `\b` rules as {@link AT_REFERENCE_PATTERN}). */
function removeAtReferenceTokensFromDraft(draft: string, n: number): string {
  const re = new RegExp(String.raw`@${n}\b`, "g");
  let s = draft.replace(re, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

/** Ensure `@n` is present or absent in the draft (append/strip, never duplicate). */
export function setAtReferenceInDraft(
  draft: string | undefined,
  n: number,
  present: boolean,
): string {
  const d = draft ?? "";
  if (present === hasAtReference(d, n)) return d;
  return present
    ? appendAtReferenceToDraft(d, n)
    : removeAtReferenceTokensFromDraft(d, n);
}

/** Make `target` contain `@n` iff `source` does — keeps two composers' refs aligned. */
export function mirrorAtReferencePresence(
  source: string,
  target: string | undefined,
  n: number,
): string {
  return setAtReferenceInDraft(target, n, hasAtReference(source, n));
}

/** Strip `@n` tokens after those refs were consumed (e.g. sent in chat). */
export function removeAtReferencesFromDraft(
  draft: string | undefined,
  numbers: number[],
): string {
  return numbers.reduce(
    (d, n) => setAtReferenceInDraft(d, n, false),
    draft ?? "",
  );
}

/** If `@n` is already in the draft, strip it; otherwise append it (like {@link appendAtReferenceToDraft}). */
export function toggleAtReferenceInDraft(
  draft: string | undefined,
  n: number,
): string {
  const d = draft ?? "";
  if (hasAtReference(d, n)) {
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
  const conceptByNumber = conceptByNumberMap(numberedConcepts);
  const conceptNumbers = [...conceptByNumber.keys()];
  const refRegex = new RegExp(AT_REFERENCE_PATTERN, "g");
  let out = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = refRegex.exec(value)) !== null) {
    const capture = m[1]!;
    const end = m.index + m[0]!.length;
    out += value.slice(lastIndex, end);
    lastIndex = end;
    const named = namedAtRef(capture);
    if (named) {
      const after = value[end];
      if (after === undefined || !/\s/.test(after)) {
        out += " ";
      }
      continue;
    }
    const num = parseInt(capture, 10);
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
    if (namedAtRef(m[1]!)) continue;
    const concept = conceptByNumber.get(parseInt(m[1]!, 10));
    if (concept) ids.add(concept.id);
  }
  return ids;
}

/** Selected concept titles ordered by concept number based on `@n` references in draft. */
export function selectedConceptTitlesFromDraft(
  draftInput: string | undefined,
  numberedConcepts: NumberedConcept[],
): string[] {
  const selectedIds = referencedConceptIdsFromDraft(draftInput, numberedConcepts);
  if (selectedIds.size === 0) return [];
  return numberedConcepts
    .filter((concept) => selectedIds.has(concept.id))
    .map((concept) => concept.name);
}

/** Render bullet list lines suitable for direct paste into markdown notes. */
export function formatReferenceTitleBullets(titles: string[]): string {
  return titles.map((title) => `- ${title}`).join("\n");
}

/** Title and optional description for clipboard — no `@n` refs or `------` blocks. */
export function formatConceptPlainForClipboard(concept: {
  name: string;
  description?: string;
}): string {
  const title = concept.name.trim();
  const desc = concept.description?.trim();
  if (!title && !desc) return "";
  if (!desc) return title;
  if (!title) return desc;
  return `${title}\n\n${desc}`;
}

/** Render markdown bullets with optional description text for each selected concept. */
export function formatReferenceConceptBullets(
  concepts: Array<{ number?: number; name: string; description?: string }>,
): string {
  const blocks = concepts.map((concept) => {
    const referenceLine =
      typeof concept.number === "number" ? `@${concept.number}` : null;
    const titleLine = `- ${concept.name}`;
    const descriptionLine = concept.description?.trim() || null;
    return [referenceLine, titleLine, descriptionLine]
      .filter((line): line is string => !!line)
      .join("\n");
  });
  if (blocks.length === 0) return "";
  return `------\n${blocks.join("\n------\n")}\n------`;
}

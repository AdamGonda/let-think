import {
  conceptByNumberMap,
  type NumberedConcept,
  AT_REFERENCE_PATTERN,
} from "./conceptReferences";

type Mention = {
  start: number;
  end: number;
  conceptId: string;
  name: string;
};

/** Parse raw input into segments — @N that match a concept become styled tokens. */
export function parseInputTokens(
  raw: string,
  numberedConcepts: NumberedConcept[],
): Array<{ type: "text" | "token"; content: string; name?: string }> {
  const conceptByNumber = conceptByNumberMap(numberedConcepts);
  const refRegex = new RegExp(AT_REFERENCE_PATTERN, "g");
  const segments: Array<{
    type: "text" | "token";
    content: string;
    name?: string;
  }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = refRegex.exec(raw)) !== null) {
    const num = parseInt(m[1]!, 10);
    const concept = conceptByNumber.get(num);
    if (lastIndex < m.index) {
      segments.push({ type: "text", content: raw.slice(lastIndex, m.index) });
    }
    segments.push({
      type: "token",
      content: m[0]!,
      name: concept?.name,
    });
    lastIndex = m.index + m[0]!.length;
  }
  if (lastIndex < raw.length) {
    segments.push({ type: "text", content: raw.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ type: "text", content: "" }];
}

/** Parse @N from raw input, resolve to concept names for LLM/store, build mentions. */
export function resolveAtReferences(
  rawContent: string,
  numberedConcepts: NumberedConcept[],
): {
  resolvedContent: string;
  referencedConcepts: NumberedConcept[];
  mentions: Mention[];
} {
  const conceptByNumber = conceptByNumberMap(numberedConcepts);
  const refRegex = new RegExp(AT_REFERENCE_PATTERN, "g");
  let resolvedContent = "";
  const mentions: Mention[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = refRegex.exec(rawContent)) !== null) {
    const num = parseInt(m[1]!, 10);
    const concept = conceptByNumber.get(num);
    if (!concept) {
      resolvedContent += rawContent.slice(lastIndex, m.index + m[0]!.length);
      lastIndex = m.index + m[0]!.length;
      continue;
    }
    resolvedContent += rawContent.slice(lastIndex, m.index);
    const start = resolvedContent.length;
    resolvedContent += concept.name;
    mentions.push({
      start,
      end: resolvedContent.length,
      conceptId: concept.id,
      name: concept.name,
    });
    lastIndex = m.index + m[0]!.length;
  }
  resolvedContent += rawContent.slice(lastIndex);

  const referencedIds = new Set(mentions.map((x) => x.conceptId));
  const referencedConcepts = numberedConcepts.filter((c) =>
    referencedIds.has(c.id),
  );
  return { resolvedContent, referencedConcepts, mentions };
}

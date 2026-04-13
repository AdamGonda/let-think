export type HistoryMention = {
  start: number;
  end: number;
  conceptId: string;
  name: string;
};

export type MentionSegment = {
  type: "text" | "mention";
  content: string;
  name: string;
};

/**
 * Builds ordered text/mention segments for display (pure; no React).
 */
export function buildMentionSegments(
  display: string,
  mentions: HistoryMention[] | undefined,
  contentEnd: number,
  truncated: boolean,
): MentionSegment[] {
  if (!mentions?.length) {
    return truncated
      ? [{ type: "text", content: "…", name: "" }]
      : [];
  }

  const sorted = [...mentions].sort((a, b) => a.start - b.start);
  const segments: MentionSegment[] = [];
  let pos = 0;
  for (const m of sorted) {
    if (m.start > pos) {
      segments.push({
        type: "text",
        content: display.slice(pos, Math.min(m.start, contentEnd)),
        name: "",
      });
    }
    if (m.start < contentEnd) {
      const end = Math.min(m.end, contentEnd);
      segments.push({
        type: "mention",
        content: display.slice(m.start, end),
        name: m.name,
      });
    }
    pos = Math.max(pos, m.end);
  }
  if (pos < contentEnd) {
    segments.push({
      type: "text",
      content: display.slice(pos, contentEnd),
      name: "",
    });
  }
  if (truncated) {
    segments.push({ type: "text", content: "…", name: "" });
  }
  return segments;
}

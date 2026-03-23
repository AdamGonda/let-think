import type { ReactNode } from "react";

export const CHAT_HISTORY_COLLAPSE_THRESHOLD = 180;
export const TOPIC_LOADING_TIMEOUT_MS = 30_000;

export type HistoryMention = {
  start: number;
  end: number;
  conceptId: string;
  name: string;
};

export function truncateAtWord(content: string, maxLen: number): string {
  if (content.length <= maxLen) return content;
  const cut = content.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const end = lastSpace > maxLen * 0.5 ? lastSpace : maxLen;
  return cut.slice(0, end).trim();
}

/** Render content with mention spans styled as pills. */
export function renderContentWithMentions(
  content: string,
  mentions?: HistoryMention[],
  truncateLen?: number,
): ReactNode {
  const truncated = truncateLen && content.length > truncateLen;
  const display = truncated
    ? truncateAtWord(content, truncateLen) + "…"
    : content;
  const contentEnd = truncated ? display.length - 1 : display.length;

  if (!mentions?.length) return display;

  const sorted = [...mentions].sort((a, b) => a.start - b.start);
  const segments: Array<{
    type: "text" | "mention";
    content: string;
    name: string;
  }> = [];
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

  return (
    <>
      {segments.map((s, i) =>
        s.type === "mention" ? (
          <span
            key={`${s.name}-${i}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-foreground border border-border"
            title={s.name}
          >
            {s.content}
          </span>
        ) : (
          s.content
        ),
      )}
    </>
  );
}

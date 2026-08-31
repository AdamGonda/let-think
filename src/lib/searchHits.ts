import type { Id } from "../../convex/_generated/dataModel";

export const WORKSPACE_SEARCH_MIN_QUERY_LENGTH = 2;

export type WorkspaceSearchHitKind = "note" | "chat" | "idea";

export function searchHitKindLabel(kind: WorkspaceSearchHitKind): string {
  if (kind === "note") return "Note";
  if (kind === "chat") return "Chat";
  return "Idea";
}

export type WorkspaceSearchHitReason = "contains" | "similar";

export type WorkspaceSearchHit = {
  kind: WorkspaceSearchHitKind;
  title: string;
  snippet: string;
  fileId: Id<"files">;
  sessionId: Id<"sessions"> | null;
  projectId: Id<"projects"> | null;
  chatSessionId: Id<"chatSessions"> | null;
  nodeId: string | null;
  batchIndex: number | null;
  score: number;
  reason: WorkspaceSearchHitReason;
  matchedTerms: string[];
};

export function searchHitReasonLabel(
  reason: WorkspaceSearchHitReason,
  matchedTerms: string[],
): string {
  if (reason === "similar" || matchedTerms.length === 0) {
    return "Similar meaning";
  }
  const shown = matchedTerms.slice(0, 3).map((term) => `“${term}”`);
  const extra = matchedTerms.length > 3 ? "…" : "";
  return `Contains ${shown.join(", ")}${extra}`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitHighlightParts(
  text: string,
  terms: string[],
): Array<{ text: string; match: boolean }> {
  if (!text || terms.length === 0) return [{ text, match: false }];
  const unique = [...new Set(terms.filter((t) => t.length > 0))];
  if (unique.length === 0) return [{ text, match: false }];
  const re = new RegExp(`(${unique.map(escapeRegExp).join("|")})`, "gi");
  const parts: Array<{ text: string; match: boolean }> = [];
  let last = 0;
  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0;
    if (start > last) {
      parts.push({ text: text.slice(last, start), match: false });
    }
    parts.push({ text: match[0] ?? "", match: true });
    last = start + (match[0]?.length ?? 0);
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), match: false });
  }
  return parts.length > 0 ? parts : [{ text, match: false }];
}

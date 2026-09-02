import type { ModelMessage } from "ai";
import {
  EMPTY_IMAGE_USER_CONTENT,
  IMAGE_PROMPT_MAX,
} from "../constants";

export type StoredChatMessage = {
  role: string;
  content?: string;
  imageStorageIds?: string[];
};

/**
 * Current-turn IDs first, then older user-message images newest-first, until `max`.
 */
export function imageIdsForPrompt(
  history: StoredChatMessage[],
  currentIds: string[],
  max = IMAGE_PROMPT_MAX,
): Set<string> {
  const out: string[] = [];
  const push = (id: string) => {
    if (out.length >= max) return;
    if (out.includes(id)) return;
    out.push(id);
  };
  for (const id of currentIds) push(id);
  for (let i = history.length - 1; i >= 0; i--) {
    for (const id of history[i]?.imageStorageIds ?? []) push(id);
  }
  return new Set(out);
}

export function userTextForModel(
  content: string | undefined,
  hasImages: boolean,
): string {
  const trimmed = content?.trim() ?? "";
  if (trimmed) return trimmed;
  return hasImages ? EMPTY_IMAGE_USER_CONTENT : "";
}

export function toModelMessagesWithImages(
  messages: StoredChatMessage[],
  images: Map<string, { bytes: Uint8Array; mediaType: string }>,
  includeIds: Set<string>,
): ModelMessage[] {
  return messages
    .filter(
      (m) =>
        m.role === "user" || m.role === "assistant" || m.role === "system",
    )
    .map((m): ModelMessage => {
      const ids =
        m.role === "user"
          ? (m.imageStorageIds ?? []).filter(
              (id) => includeIds.has(id) && images.has(id),
            )
          : [];
      const text = userTextForModel(m.content, ids.length > 0);
      if (m.role === "system") {
        return { role: "system", content: text };
      }
      if (m.role === "assistant") {
        return { role: "assistant", content: text };
      }
      if (ids.length === 0) {
        return { role: "user", content: text };
      }
      return {
        role: "user",
        content: [
          { type: "text" as const, text },
          ...ids.map((id) => {
            const img = images.get(id)!;
            return {
              type: "image" as const,
              image: img.bytes,
              mediaType: img.mediaType,
            };
          }),
        ],
      };
    });
}

import { marked } from "marked";

const renderer = new marked.Renderer();
renderer.html = () => "";

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "EM",
  "B",
  "I",
  "U",
  "S",
  "DEL",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "CODE",
  "PRE",
  "A",
  "HR",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
  "IMG",
]);

const DROP_TAGS = new Set([
  "SCRIPT",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "FORM",
  "LINK",
  "META",
  "STYLE",
  "BASE",
]);

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return true;
  return /^(https?:|mailto:)/i.test(trimmed);
}

function sanitizeChatHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const el of [...doc.body.querySelectorAll("*")].reverse()) {
    if (DROP_TAGS.has(el.tagName)) {
      el.remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc") {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === "A") {
      const href = el.getAttribute("href") ?? "";
      if (!isSafeHref(href)) el.removeAttribute("href");
      el.setAttribute("rel", "noopener noreferrer");
      el.setAttribute("target", "_blank");
    }
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src") ?? "";
      if (!/^https?:/i.test(src.trim())) el.remove();
    }
  }
  return doc.body.innerHTML;
}

/** Render assistant chat markdown to sanitized HTML. */
export function renderChatMarkdown(markdown: string): string {
  const html = marked.parse(markdown, {
    async: false,
    gfm: true,
    breaks: true,
    renderer,
  }) as string;
  return sanitizeChatHtml(html);
}

import { describe, expect, it } from "vitest";
import { renderChatMarkdown } from "./chatMarkdown";

describe("renderChatMarkdown", () => {
  it("renders headings, bold, and lists", () => {
    const html = renderChatMarkdown(
      "### Why murmurations?\n\n**Emergence** is the point.\n\n- Fish\n- Insects",
    );
    expect(html).toContain("<h3>");
    expect(html).toContain("Why murmurations?");
    expect(html).toMatch(/<(strong|b)>Emergence<\/(strong|b)>/);
    expect(html).toContain("<li>");
    expect(html).toContain("Fish");
  });

  it("renders GFM tables as HTML tables", () => {
    const html = renderChatMarkdown(
      "| Feature | Now | Next |\n| --- | --- | --- |\n| Device | Phone | AR |\n",
    );
    expect(html).toContain("<table>");
    expect(html).toContain("<th>");
    expect(html).toContain("Feature");
    expect(html).toContain("Phone");
    expect(html).toContain('class="chat-md-table-wrap"');
  });

  it("drops raw HTML and javascript links", () => {
    const html = renderChatMarkdown(
      '<script>alert(1)</script>\n[x](javascript:alert(1))\n**ok**',
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).toMatch(/<(strong|b)>ok<\/(strong|b)>/);
  });
});

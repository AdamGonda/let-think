import {
  defaultKeymap,
  history,
  historyKeymap,
} from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { foldGutter, foldKeymap, foldNodeProp } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  keymap,
} from "@codemirror/view";

export const markdownEditorLanguage = markdown({
  addKeymap: false,
  completeHTMLTags: false,
  pasteURLAsLink: false,
  // ponytail: lang-markdown also folds multi-line Paragraph nodes; writers
  // treat those as body text. Heading (and code/quote) folds stay.
  extensions: [
    {
      props: [
        foldNodeProp.add({
          Paragraph: () => null,
        }),
      ],
    },
  ],
});

function foldGutterExtension(): Extension {
  return foldGutter({
    markerDOM(open) {
      const span = document.createElement("span");
      span.className = open ? "cm-foldMarker-open" : "cm-foldMarker-closed";
      span.setAttribute("aria-label", open ? "Fold section" : "Unfold section");
      span.textContent = open ? "▾" : "▸";
      return span;
    },
  });
}

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    fontFamily:
      'ui-monospace, "SF Mono", "Cascadia Mono", "JetBrains Mono", Menlo, Consolas, monospace',
    lineHeight: "1.6",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
});

export function markdownEditorExtensions(placeholderExt: Extension): Extension[] {
  return [
    markdownEditorLanguage,
    history(),
    foldGutterExtension(),
    drawSelection(),
    EditorView.lineWrapping,
    keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
    placeholderExt,
    EditorView.contentAttributes.of({ spellcheck: "true" }),
    editorTheme,
  ];
}

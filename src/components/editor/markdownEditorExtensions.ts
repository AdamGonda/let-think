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

function foldMarkerButton(open: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `cm-foldMarker ${open ? "cm-foldMarker-open" : "cm-foldMarker-closed"}`;
  button.setAttribute("aria-label", open ? "Fold section" : "Unfold section");
  return button;
}

function foldGutterExtension(): Extension {
  return foldGutter({
    markerDOM: foldMarkerButton,
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
    fontFamily: 'var(--font-sans)',
    lineHeight: "1.6",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    fontSize: "22px",
    lineHeight: "1.6",
  },
  ".cm-foldGutter": {
    width: "1.35em",
  },
  ".cm-foldGutter .cm-gutterElement:has(.cm-foldMarker)": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    boxSizing: "border-box",
  },
  ".cm-foldMarker": {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    font: "inherit",
    lineHeight: "1",
    width: "1.15em",
    height: "1.15em",
    flexShrink: "0",
    padding: "0",
    margin: "0",
    border: "1.5px solid rgb(161 161 170 / 0.4)",
    borderRadius: "0.375rem",
    backgroundColor: "transparent",
    color: "#a1a1aa",
    cursor: "pointer",
    appearance: "none",
    boxSizing: "border-box",
    transform: "translateY(-0.08em)",
  },
  ".cm-foldMarker::before, .cm-foldMarker::after": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "currentColor",
    borderRadius: "1px",
  },
  ".cm-foldMarker::before": {
    width: "0.55em",
    height: "2.5px",
  },
  ".cm-foldMarker::after": {
    width: "2.5px",
    height: "0.55em",
  },
  ".cm-foldMarker-open::after": {
    content: "none",
  },
  ".cm-foldMarker-open": {
    opacity: "0",
    borderColor: "transparent",
  },
  ".cm-gutters:hover .cm-foldMarker-open, .cm-activeLineGutter .cm-foldMarker-open": {
    opacity: "0.9",
    borderColor: "rgb(161 161 170 / 0.45)",
  },
  ".cm-foldMarker-closed": {
    opacity: "1",
    backgroundColor: "#a1a1aa",
    borderColor: "#a1a1aa",
    color: "#18181b",
  },
  ".cm-foldMarker-closed:hover": {
    backgroundColor: "#d4d4d8",
    borderColor: "#d4d4d8",
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

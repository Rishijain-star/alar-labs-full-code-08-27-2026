import { Extension } from "@tiptap/core";

/**
 * Applies font family to the entire document (all text nodes).
 * Does not alter other marks or block structure.
 */
export const DocumentFontCommands = Extension.create({
  name: "documentFontCommands",

  addCommands() {
    return {
      setDocumentFontFamily:
        (fontFamily) =>
        ({ editor, chain }) => {
          const { from, to } = editor.state.selection;
          const end = editor.state.doc.content.size;

          if (!fontFamily) {
            return chain()
              .focus()
              .selectAll()
              .unsetFontFamily()
              .setTextSelection({ from: Math.min(from, end - 1), to: Math.min(to, end - 1) })
              .run();
          }

          return chain()
            .focus()
            .selectAll()
            .setFontFamily(fontFamily)
            .setTextSelection({ from: Math.min(from, end - 1), to: Math.min(to, end - 1) })
            .run();
        },
    };
  },
});

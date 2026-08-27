import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

function imageStyleParts(align, width, height) {
  const styleParts = [];
  if (width) {
    const w = String(width).replace(/px$/, "");
    styleParts.push(`width:${w}px`);
  }
  if (height) {
    const h = String(height).replace(/px$/, "");
    styleParts.push(`height:${h}px`);
  }

  if (align === "left") {
    styleParts.push(
      "float:left",
      "margin-right:1rem",
      "margin-bottom:0.5rem",
    );
  } else if (align === "right") {
    styleParts.push(
      "float:right",
      "margin-left:1rem",
      "margin-bottom:0.5rem",
    );
  } else if (align === "inline") {
    styleParts.push(
      "display:inline-block",
      "vertical-align:top",
      "margin-right:0.5rem",
      "margin-bottom:0.25rem",
    );
  } else {
    styleParts.push(
      "display:block",
      "margin-left:auto",
      "margin-right:auto",
      "margin-bottom:0",
    );
  }

  styleParts.push("max-width:100%");
  return styleParts.join(";");
}

/** Image with width, height, align — wrapped for vertical document flow. */
export const ResizableImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const attr = el.getAttribute("width");
          if (attr) return attr.replace(/px$/, "");
          const fromStyle = el.style.width?.replace(/px$/, "");
          return fromStyle || null;
        },
      },
      height: {
        default: null,
        parseHTML: (el) => {
          const attr = el.getAttribute("height");
          if (attr) return attr.replace(/px$/, "");
          const fromStyle = el.style.height?.replace(/px$/, "");
          return fromStyle || null;
        },
      },
      align: {
        default: "center",
        parseHTML: (el) =>
          el.dataset.align ||
          el.closest(".tiptap-image-wrap")?.dataset?.imageAlign ||
          "center",
      },
    };
  },

  parseHTML() {
    return [
      { tag: "div.tiptap-image-wrap img" },
      { tag: "img[src]" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes["data-align"] || HTMLAttributes.align || "center";
    const width = HTMLAttributes.width;
    const height = HTMLAttributes.height;

    return [
      "div",
      {
        class: "tiptap-image-wrap",
        "data-image-align": align,
        contenteditable: "false",
      },
      [
        "img",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          style: imageStyleParts(align, width, height),
          contenteditable: "false",
          "data-align": align,
        }),
      ],
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align) =>
        ({ commands }) =>
          commands.updateAttributes("image", { align }),

      insertImageAndContinue:
        (attrs) =>
        ({ editor, chain }) => {
          const from = editor.state.selection.from;
          const ok = chain()
            .insertContent([
              {
                type: "image",
                attrs: {
                  src: attrs.src,
                  align: attrs.align || "center",
                  width: attrs.width || null,
                  height: attrs.height || null,
                },
              },
              { type: "paragraph" },
            ])
            .run();

          if (!ok) return false;

          let imagePos = null;
          editor.state.doc.descendants((node, pos) => {
            if (imagePos != null) return false;
            if (node.type.name === "image" && pos >= from - 1) {
              imagePos = pos;
              return false;
            }
            return undefined;
          });

          if (imagePos != null) {
            const imageNode = editor.state.doc.nodeAt(imagePos);
            const afterImage = imagePos + (imageNode?.nodeSize || 1);
            editor.view.dispatch(
              editor.state.tr.setSelection(
                TextSelection.near(editor.state.doc.resolve(afterImage), 1),
              ),
            );
          }
          return true;
        },
    };
  },
});

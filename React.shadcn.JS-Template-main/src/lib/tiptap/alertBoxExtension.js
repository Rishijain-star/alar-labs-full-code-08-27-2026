import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { alertTypeMeta } from "@/lib/alertTypes";

export const AlertBox = Node.create({
  name: "alertBox",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      alertType: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-alert-type") || "info",
        renderHTML: (attrs) => ({
          "data-alert-type": attrs.alertType || "info",
        }),
      },
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-alert-title") || null,
        renderHTML: (attrs) => {
          if (!attrs.title) return {};
          return { "data-alert-title": attrs.title };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-alert-box]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.alertType || "info";
    const meta = alertTypeMeta(type);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-alert-box": "",
        "data-alert-type": type,
        "data-alert-label": meta.label,
        class: `tiptap-alert-box tiptap-alert-box--${type}`,
        style: `--alert-accent:${meta.color}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertAlertBox:
        (attrs = {}) =>
        ({ editor, chain }) => {
          const alertType = attrs.alertType || "info";
          const from = editor.state.selection.from;
          const ok = chain()
            .insertContent([
              {
                type: this.name,
                attrs: {
                  alertType,
                  title: attrs.title || null,
                },
                content: [{ type: "paragraph" }],
              },
              { type: "paragraph" },
            ])
            .run();

          if (!ok) return false;

          let focusPos = null;
          editor.state.doc.descendants((node, pos) => {
            if (focusPos != null) return false;
            if (node.type.name === this.name && pos >= from - 1) {
              focusPos = pos + 1;
            }
            return undefined;
          });

          if (focusPos != null) {
            editor.view.dispatch(
              editor.state.tr.setSelection(
                TextSelection.near(editor.state.doc.resolve(focusPos)),
              ),
            );
          }
          return true;
        },

      setAlertBoxType:
        (alertType) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { alertType }),

      setAlertBoxTitle:
        (title) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { title: title || null }),
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty) return false;

        for (let depth = $from.depth; depth > 0; depth -= 1) {
          if ($from.node(depth).type.name !== this.name) continue;

          const isLastBlock = $from.index(depth) === $from.node(depth).childCount - 1;
          const isEmptyParagraph =
            $from.parent.type.name === "paragraph" && $from.parent.content.size === 0;

          if (isLastBlock && isEmptyParagraph) {
            const after = $from.after(depth);
            return editor
              .chain()
              .deleteRange({ from: $from.before(depth + 1), to: $from.after(depth + 1) })
              .insertContentAt(after - 1, { type: "paragraph" })
              .focus(after)
              .run();
          }
          return false;
        }
        return false;
      },

      "Mod-Enter": ({ editor }) => {
        const { $from } = editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          if ($from.node(depth).type.name !== this.name) continue;
          const after = $from.after(depth);
          return editor
            .chain()
            .insertContentAt(after, { type: "paragraph" })
            .focus(after + 1)
            .run();
        }
        return false;
      },
    };
  },
});

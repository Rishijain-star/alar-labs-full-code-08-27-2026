import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { mergeAttributes } from "@tiptap/core";

/** Nested <ol> with local browser counters: 1→a→i, reset per parent. */
export const OutlineOrderedList = OrderedList.extend({
  name: "orderedList",

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: "outline-list",
        "data-outline-list": "",
      },
      keepMarks: true,
      keepAttributes: true,
    };
  },

  parseHTML() {
    return [
      { tag: "ol[data-outline-list]" },
      { tag: "ol.ql-hierarchy-list" },
      { tag: "ol.quill-nested-list" },
      { tag: "ol" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

export const OutlineListItem = ListItem.extend({
  name: "listItem",

  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: "li[data-outline-item]" },
      { tag: "li.ql-hierarchy-item" },
      { tag: "li" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "li",
      {
        ...HTMLAttributes,
        "data-outline-item": "",
        class: "outline-list-item",
      },
      0,
    ];
  },
});

export const OutlineListKit = [OutlineOrderedList, OutlineListItem];

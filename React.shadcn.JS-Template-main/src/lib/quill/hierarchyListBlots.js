import Quill from "quill";

export const HIERARCHY_LIST_CLASS = "ql-hierarchy-list";
export const HIERARCHY_ITEM_CLASS = "ql-hierarchy-item";
export const HIERARCHY_EMBED_CLASS = "ql-outline-list";
export const STYLE_CYCLE = ["decimal", "lower-alpha", "lower-roman"];

let registered = false;

export function listStyleForHierarchyLevel(level) {
  return STYLE_CYCLE[Math.max(0, level) % STYLE_CYCLE.length];
}

export function markHierarchyOl(ol, level = 0) {
  ol.classList.add(HIERARCHY_LIST_CLASS, "quill-nested-list");
  ol.setAttribute("data-h-level", String(level));
  ol.style.listStyleType = listStyleForHierarchyLevel(level);
}

export function markHierarchyLi(li) {
  li.classList.add(HIERARCHY_ITEM_CLASS);
  li.removeAttribute("data-list");
  [...li.classList]
    .filter((cls) => cls.startsWith("ql-indent-"))
    .forEach((cls) => li.classList.remove(cls));
  li.querySelector(":scope > .ql-ui")?.remove();
}

/**
 * Parchment blots for nested 1 → a → i lists (native browser numbering per parent).
 */
export function registerHierarchyListBlots() {
  if (registered) return;
  registered = true;

  const Container = Quill.import("blots/container");
  const Block = Quill.import("blots/block");
  const BlockEmbed = Quill.import("blots/block/embed");

  class HierarchyListContainer extends Container {
    static blotName = "hierarchy-list-container";
    static tagName = "OL";
    static className = HIERARCHY_LIST_CLASS;

    static create(value) {
      const node = super.create();
      const level =
        typeof value === "object" && value != null
          ? Number(value.level ?? 0)
          : Number(value ?? 0);
      markHierarchyOl(node, level);
      return node;
    }

    static formats(domNode) {
      return {
        level: Number(domNode.getAttribute("data-h-level") || 0),
      };
    }
  }

  class HierarchyListItem extends Block {
    static blotName = "hierarchy-item";
    static tagName = "LI";
    static className = HIERARCHY_ITEM_CLASS;

    static create() {
      const node = super.create();
      markHierarchyLi(node);
      return node;
    }

    constructor(scroll, domNode) {
      super(scroll, domNode);
      markHierarchyLi(domNode);
    }
  }

  HierarchyListContainer.allowedChildren = [HierarchyListItem];
  HierarchyListItem.requiredContainer = HierarchyListContainer;

  class HierarchyListEmbed extends BlockEmbed {
    static blotName = "outline-list";
    static tagName = "div";
    static className = HIERARCHY_EMBED_CLASS;

    static create(value) {
      const node = super.create();
      node.setAttribute("contenteditable", "false");
      node.classList.add("quill-nested-outline", "ql-hierarchy-embed");

      const html =
        typeof value === "string" && value.trim()
          ? value
          : `<ol class="${HIERARCHY_LIST_CLASS} quill-nested-list" data-h-level="0" style="list-style-type: decimal"><li class="${HIERARCHY_ITEM_CLASS}">Item</li></ol>`;

      node.innerHTML = html;
      node.querySelectorAll(`ol.${HIERARCHY_LIST_CLASS}`).forEach((ol) => {
        const level = Number(ol.getAttribute("data-h-level") || 0);
        markHierarchyOl(ol, level);
      });
      node.querySelectorAll(`li.${HIERARCHY_ITEM_CLASS}, ol.${HIERARCHY_LIST_CLASS} > li`).forEach(
        (li) => markHierarchyLi(li),
      );
      return node;
    }

    static value(domNode) {
      return domNode.innerHTML;
    }
  }

  Quill.register(HierarchyListContainer, true);
  Quill.register(HierarchyListItem, true);
  Quill.register(HierarchyListEmbed, true);
}

export function findHierarchyEmbedFromTarget(target, root) {
  if (!target || !root) return null;
  const el = target instanceof Element ? target : target.parentElement;
  return el?.closest?.(`.${HIERARCHY_EMBED_CLASS}`) || null;
}

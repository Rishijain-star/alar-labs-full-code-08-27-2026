import {
  HIERARCHY_LIST_CLASS,
  markHierarchyLi,
  markHierarchyOl,
} from "./hierarchyListBlots";
import { transformFlatListsToNested } from "../quillListNested";

export function hasFlatQuillOrderedList(root) {
  return root?.querySelector?.('ol > li[data-list="ordered"]') != null;
}

function wrapTopLevelHierarchyLists(root) {
  if (!root) return;

  [...root.querySelectorAll(`ol.${HIERARCHY_LIST_CLASS}`)].forEach((ol) => {
    if (ol.closest(".ql-outline-list, .ql-hierarchy-embed")) return;
    if (ol.parentElement?.closest(`ol.${HIERARCHY_LIST_CLASS}`)) return;

    const embed = document.createElement("div");
    embed.className = "ql-outline-list quill-nested-outline ql-hierarchy-embed";
    embed.setAttribute("contenteditable", "false");
    ol.parentNode?.insertBefore(embed, ol);
    embed.appendChild(ol);
  });
}

function decorateHierarchyTree(root) {
  if (!root) return;

  root.querySelectorAll(`ol.${HIERARCHY_LIST_CLASS}`).forEach((ol) => {
    const parentLi = ol.parentElement;
    const parentOl = parentLi?.closest(`ol.${HIERARCHY_LIST_CLASS}`);
    const level = parentOl
      ? Number(parentOl.getAttribute("data-h-level") || 0) + 1
      : Number(ol.getAttribute("data-h-level") || 0);
    markHierarchyOl(ol, level);
  });

  root
    .querySelectorAll(`ol.${HIERARCHY_LIST_CLASS} > li`)
    .forEach((li) => markHierarchyLi(li));
}

/**
 * Attach hierarchy list behaviour (no custom Quill module — safe with react-quill).
 */
export function attachHierarchyListModule(quill) {
  if (!quill?.root) {
    return { scheduleNormalize() {}, toggleOrdered() {}, handleIndent() { return false; }, cleanup() {} };
  }

  let applying = false;
  let frame = 0;

  const normalize = () => {
    if (applying || !quill.root) return;

    const root = quill.root;
    const hadFlat = hasFlatQuillOrderedList(root);

    if (hadFlat) {
      transformFlatListsToNested(root);
    }

    decorateHierarchyTree(root);

    if (hadFlat) {
      applying = true;
      try {
        wrapTopLevelHierarchyLists(root);
        quill.update("silent");
      } finally {
        applying = false;
      }
    }
  };

  const scheduleNormalize = () => {
    if (applying) return;
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(normalize);
  };

  const toggleOrdered = () => {
    const range = quill.getSelection(true);
    if (!range) return;

    const formats = quill.getFormat(range);
    if (formats.list) {
      quill.format("list", false, "user");
      return;
    }

    quill.format("list", "ordered", "user");
    scheduleNormalize();
  };

  const handleIndent = (direction) => {
    const range = quill.getSelection(true);
    if (!range) return false;

    const formats = quill.getFormat(range);
    if (!formats.list && !formats.indent) {
      return false;
    }

    quill.format("indent", direction, "user");
    scheduleNormalize();
    return true;
  };

  const onTextChange = () => scheduleNormalize();

  quill.on("text-change", onTextChange);
  scheduleNormalize();

  const cleanup = () => {
    window.cancelAnimationFrame(frame);
    quill.off("text-change", onTextChange);
  };

  return { scheduleNormalize, toggleOrdered, handleIndent, cleanup };
}

/** @deprecated No-op — hierarchy is attached via attachHierarchyListModule */
export function registerHierarchyListModule() {}

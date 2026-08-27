import { getQuillListIndentLevel } from "./quillListMarkers";
import {
  HIERARCHY_ITEM_CLASS,
  HIERARCHY_LIST_CLASS,
  listStyleForHierarchyLevel,
  markHierarchyLi,
  markHierarchyOl,
} from "./quill/hierarchyListBlots";

const BULLET_STYLES = ["disc", "circle", "square"];

function listStyleForLevel(level, listType) {
  if (listType === "bullet") {
    return BULLET_STYLES[level % BULLET_STYLES.length];
  }
  return listStyleForHierarchyLevel(level);
}

function getLiInnerHtml(li) {
  const clone = li.cloneNode(true);
  clone
    .querySelectorAll(
      `.ql-ui, .quill-list-marker, .quill-local-marker, ol.${HIERARCHY_LIST_CLASS}`,
    )
    .forEach((el) => el.remove());
  return clone.innerHTML;
}

function isQuillFlatList(ol) {
  return ol.querySelector(":scope > li[data-list]") != null;
}

function buildNestedItems(items, startIndex, level) {
  const nodes = [];
  let i = startIndex;

  while (i < items.length) {
    const src = items[i];
    const itemLevel = getQuillListIndentLevel(src);

    if (itemLevel < level) break;
    if (itemLevel > level) {
      i += 1;
      continue;
    }

    const li = document.createElement("li");
    li.innerHTML = getLiInnerHtml(src);
    markHierarchyLi(li);
    i += 1;

    if (i < items.length && getQuillListIndentLevel(items[i]) === level + 1) {
      const listType = items[i].getAttribute("data-list") || "ordered";
      const childOl = document.createElement("ol");
      markHierarchyOl(childOl, level + 1);
      childOl.style.listStyleType = listStyleForLevel(level + 1, listType);

      const childResult = buildNestedItems(items, i, level + 1);
      childResult.nodes.forEach((child) => childOl.appendChild(child));
      if (childOl.children.length > 0) li.appendChild(childOl);
      i = childResult.nextIndex;
    }

    nodes.push(li);
  }

  return { nodes, nextIndex: i };
}

/**
 * Convert Quill flat <ol> (ql-indent) into nested hierarchy lists.
 * Browser resets roman numerals under each alpha parent automatically.
 */
export function transformFlatListsToNested(root) {
  if (!root) return;

  root.querySelectorAll("ol").forEach((ol) => {
    if (!isQuillFlatList(ol)) return;
    if (ol.classList.contains(HIERARCHY_LIST_CLASS) && !isQuillFlatList(ol)) return;

    const items = [...ol.querySelectorAll(":scope > li[data-list]")];
    if (!items.length) return;

    const listType = items[0].getAttribute("data-list") || "ordered";
    const { nodes } = buildNestedItems(items, 0, 0);

    ol.innerHTML = "";
    markHierarchyOl(ol, 0);
    ol.style.listStyleType = listStyleForLevel(0, listType);
    nodes.forEach((node) => ol.appendChild(node));
  });
}

export function transformFlatListHtml(html) {
  if (!html || typeof html !== "string") return html || "";
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;
  transformFlatListsToNested(template.content);
  return template.innerHTML;
}

export function hasFlatQuillList(root) {
  return root?.querySelector?.("ol > li[data-list]") != null;
}

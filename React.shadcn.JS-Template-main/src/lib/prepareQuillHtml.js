import { transformFlatListsToNested } from "./quillListNested";
import { HIERARCHY_EMBED_CLASS } from "./quill/hierarchyListBlots";

const OUTLINE_LIST_CLASS = "outline-list";
const OUTLINE_ITEM_CLASS = "outline-list-item";

function isQuillFlatListOl(ol) {
  return ol.querySelector(":scope > li[data-list]") != null;
}

function isNestedNativeOl(ol) {
  if (isQuillFlatListOl(ol)) return false;
  if (
    ol.classList.contains(OUTLINE_LIST_CLASS) ||
    ol.hasAttribute("data-outline-list") ||
    ol.classList.contains("ql-hierarchy-list") ||
    ol.classList.contains("quill-nested-list")
  ) {
    return true;
  }
  return ol.querySelector(":scope > li > ol") != null;
}

/** Tag TipTap / nested outline lists so learner CSS applies native 1 → a → i markers. */
function ensureOutlineListMarkup(root) {
  if (!root) return;

  root.querySelectorAll("ol").forEach((ol) => {
    if (isQuillFlatListOl(ol)) return;

    const inOutlineTree =
      isNestedNativeOl(ol) ||
      ol.closest(`ol.${OUTLINE_LIST_CLASS}, ol[data-outline-list]`) != null;

    if (!inOutlineTree) return;

    ol.classList.add(OUTLINE_LIST_CLASS);
    ol.setAttribute("data-outline-list", "");

    ol.querySelectorAll(":scope > li").forEach((li) => {
      li.classList.add(OUTLINE_ITEM_CLASS);
      li.setAttribute("data-outline-item", "");
    });
  });
}

function extractInlineColor(el) {
  if (!el?.getAttribute) return null;
  const style = el.getAttribute("style") || "";
  const match = style.match(/(?:^|;)\s*color\s*:\s*([^;!]+)/i);
  return match ? match[1].trim() : null;
}

function findFirstColorInListItem(li) {
  const self = extractInlineColor(li);
  if (self) return self;
  for (const el of li.querySelectorAll("[style]")) {
    const color = extractInlineColor(el);
    if (color) return color;
  }
  return null;
}

/** Copy text color from list item content onto `<li>` so bullets/numbers inherit the same color. */
export function propagateListItemColors(root) {
  if (!root) return;
  root.querySelectorAll("ul li, ol li").forEach((li) => {
    const color = findFirstColorInListItem(li);
    if (!color) return;
    const prev = li.getAttribute("style") || "";
    if (/color\s*:/i.test(prev)) {
      li.setAttribute(
        "style",
        prev.replace(/color\s*:\s*[^;!]+/i, `color: ${color}`),
      );
      return;
    }
    const sep = prev && !prev.trim().endsWith(";") ? ";" : "";
    li.setAttribute("style", `${prev}${sep}color: ${color}`);
  });
}

export function propagateListItemColorsInHtml(html) {
  if (!html || typeof html !== "string") return html || "";
  if (typeof document === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  propagateListItemColors(template.content);
  return template.innerHTML;
}

/**
 * Prepare rich text HTML for learner/detail views.
 * Unwrap legacy embeds, convert flat Quill lists, and mark outline lists for display CSS.
 */
export function prepareQuillHtmlForDisplay(html) {
  if (!html || typeof html !== "string") return html || "";
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  template.content
    .querySelectorAll(`.${HIERARCHY_EMBED_CLASS}, .ql-hierarchy-embed`)
    .forEach((embed) => {
      const fragment = document.createDocumentFragment();
      while (embed.firstChild) {
        fragment.appendChild(embed.firstChild);
      }
      embed.replaceWith(fragment);
    });

  transformFlatListsToNested(template.content);
  ensureOutlineListMarkup(template.content);
  propagateListItemColors(template.content);
  wrapStandaloneImages(template.content);
  return template.innerHTML;
}

/** Wrap bare <img> so floats stay contained and blocks stack vertically on the learner view. */
function wrapStandaloneImages(root) {
  if (!root) return;

  root.querySelectorAll("img").forEach((img) => {
    if (img.closest(".tiptap-image-wrap")) return;

    const wrap = document.createElement("div");
    wrap.className = "tiptap-image-wrap";
    wrap.dataset.imageAlign = img.dataset.align || "center";

    const parent = img.parentElement;
    if (
      parent?.tagName === "P" &&
      [...parent.childNodes].every(
        (n) =>
          n === img ||
          (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()),
      )
    ) {
      parent.replaceWith(wrap);
      wrap.appendChild(img);
      return;
    }

    parent?.insertBefore(wrap, img);
    wrap.appendChild(img);
  });
}

const OUTLINE_LIST_CLASS = "outline-list";

export const OUTLINE_LIST_STYLES = ["decimal", "lower-alpha", "lower-roman"];

export function outlineListStyle(level) {
  return OUTLINE_LIST_STYLES[Math.min(2, Math.max(0, level))];
}

function listAttrs(level) {
  return {
    "data-outline-list": "",
    "data-outline-level": String(level),
    class: OUTLINE_LIST_CLASS,
    style: `list-style-type: ${outlineListStyle(level)}`,
  };
}

/** Strip optional list markers the user may have typed manually. */
function stripLeadingMarker(text) {
  return text
    .replace(/^\d+\.\s+/, "")
    .replace(/^[a-z]\.\s+/i, "")
    .replace(/^(i{1,3}|iv|v|vi{0,3}|ix|x)\.\s+/i, "")
    .trim();
}

/** Parse indented plain text into outline rows (level 0 = 1, 2, 3…). */
export function parseOutlineText(text) {
  if (!text || typeof text !== "string") return [];

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(\t+| +)/);
      const prefix = match ? match[1] : "";
      let level = 0;

      for (const ch of prefix) {
        if (ch === "\t") level += 1;
      }
      level += Math.floor(prefix.replace(/\t/g, "").length / 2);

      const raw = line.slice(prefix.length).trim();
      const content = stripLeadingMarker(raw) || raw;
      return { level, text: content };
    })
    .filter((item) => item.text);
}

function buildLevel(items, startIndex, level) {
  const ol = document.createElement("ol");
  Object.entries(listAttrs(level)).forEach(([key, val]) => {
    if (key === "class") ol.className = val;
    else ol.setAttribute(key, val);
  });

  let i = startIndex;
  while (i < items.length) {
    const item = items[i];
    if (item.level < level) break;
    if (item.level > level) {
      i += 1;
      continue;
    }

    const li = document.createElement("li");
    li.setAttribute("data-outline-item", "");
    li.className = "outline-list-item";
    const p = document.createElement("p");
    p.textContent = item.text;
    li.appendChild(p);
    i += 1;

    if (i < items.length && items[i].level === level + 1) {
      const child = buildLevel(items, i, level + 1);
      li.appendChild(child.ol);
      i = child.nextIndex;
    }

    ol.appendChild(li);
  }

  return { ol, nextIndex: i };
}

/** Build nested outline HTML for TipTap insertContent. */
export function buildOutlineHtmlFromItems(items) {
  if (!items?.length) {
    return `<ol data-outline-list data-outline-level="0" class="${OUTLINE_LIST_CLASS}" style="list-style-type: decimal"><li data-outline-item class="outline-list-item"><p>List item</p></li></ol>`;
  }
  if (typeof document === "undefined") return "";

  const { ol } = buildLevel(items, 0, 0);
  return ol.outerHTML;
}

export function buildOutlineHtmlFromText(text) {
  return buildOutlineHtmlFromItems(parseOutlineText(text));
}

/** Reverse nested outline HTML to indented plain text. */
export function nestedHtmlToOutlineText(html) {
  if (!html || typeof html !== "string" || typeof document === "undefined") {
    return "";
  }

  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const root = template.content.querySelector(
    "ol[data-outline-list], ol.ql-hierarchy-list, ol.quill-nested-list, ol",
  );
  if (!root) return "";

  const lines = [];

  function liText(li) {
    const clone = li.cloneNode(true);
    clone.querySelectorAll("ol").forEach((ol) => ol.remove());
    return clone.textContent.trim();
  }

  function walk(ol, level) {
    [...ol.children].forEach((li) => {
      if (li.tagName !== "LI") return;
      const text = liText(li);
      if (text) lines.push(`${"\t".repeat(level)}${text}`);
      const childOl = li.querySelector(":scope > ol");
      if (childOl) walk(childOl, level + 1);
    });
  }

  walk(root, 0);
  return lines.join("\n");
}

export const OUTLINE_PLACEHOLDER = `Main topic
  Sub point a
    Detail one
    Detail two
  Sub point b
Another topic`;

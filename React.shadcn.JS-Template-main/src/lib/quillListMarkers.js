/** Indent depth from Quill `ql-indent-N` class (0 = top-level list item). */
export function getQuillListIndentLevel(li) {
  const match = [...li.classList].find((cls) => cls.startsWith("ql-indent-"));
  return match ? parseInt(match.replace("ql-indent-", ""), 10) : 0;
}

/** Quill cycles list styles every 3 indent levels: decimal → alpha → roman. */
export const ROMAN_INDENT_LEVELS = [2, 5, 8];

const ROMAN_ONES = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];
const ROMAN_TENS = ["", "x", "xx", "xxx"];
const MARKER_CLASS = "quill-list-marker";
const MANAGED_CLASS = "quill-roman-managed";

/** Lowercase roman numerals for list markers (1–39). */
export function toRomanLower(num) {
  if (!Number.isFinite(num) || num < 1) return "i";
  if (num > 39) return String(num);

  const tens = Math.floor(num / 10);
  const ones = num % 10;
  return `${ROMAN_TENS[tens] || ""}${ROMAN_ONES[ones] || ""}` || "i";
}

export function getListUi(li) {
  if (!li) return null;
  const direct = li.querySelector(":scope > .ql-ui");
  if (direct) return direct;
  return [...li.children].find((el) => el.classList?.contains("ql-ui")) || null;
}

function clearEditorMarker(li) {
  li.classList.remove(MANAGED_CLASS);
  li.removeAttribute("data-roman-marker");
  li.querySelector(`:scope > .${MARKER_CLASS}`)?.remove();
  const ui = getListUi(li);
  if (ui) {
    ui.style.removeProperty("display");
    ui.removeAttribute("data-list-marker");
  }
}

function placeEditorMarker(li, text) {
  const ui = getListUi(li);
  const marker = document.createElement("span");
  marker.className = MARKER_CLASS;
  marker.setAttribute("contenteditable", "false");
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = text;

  li.classList.add(MANAGED_CLASS);
  li.setAttribute("data-roman-marker", text.trim());

  if (ui) {
    ui.style.display = "none";
    ui.setAttribute("data-list-marker", text.trim());
    ui.insertAdjacentElement("afterend", marker);
  } else {
    li.insertBefore(marker, li.firstChild);
  }
}

/**
 * Editor fix: hide Quill's global roman counters and inject per-parent markers.
 */
export function applyPerParentRomanMarkers(root) {
  if (!root) return;

  root.querySelectorAll("ol").forEach((ol) => {
    const items = [...ol.querySelectorAll(":scope > li[data-list=ordered]")];
    const counters = new Map(ROMAN_INDENT_LEVELS.map((lvl) => [lvl, 0]));

    items.forEach((li) => {
      const level = getQuillListIndentLevel(li);
      clearEditorMarker(li);

      ROMAN_INDENT_LEVELS.forEach((romanLvl) => {
        const parentLvl = romanLvl - 1;
        if (level <= parentLvl) counters.set(romanLvl, 0);
        if (level === parentLvl) counters.set(romanLvl, 0);
      });

      const romanLevel = ROMAN_INDENT_LEVELS.find((lvl) => lvl === level);
      if (!romanLevel) return;

      const next = (counters.get(romanLevel) || 0) + 1;
      counters.set(romanLevel, next);
      placeEditorMarker(li, `${toRomanLower(next)}.\u00a0`);
    });
  });
}

/** Keep roman sub-list numbers local to each parent while editing. */
export function attachListMarkerFix(quill) {
  if (!quill?.root) return () => {};

  let frame = 0;
  let applying = false;

  const refresh = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      if (applying) return;
      applying = true;
      try {
        applyPerParentRomanMarkers(quill.root);
      } finally {
        applying = false;
      }
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (applying) return;
    const fromUs = mutations.every(
      (m) =>
        m.target?.classList?.contains(MARKER_CLASS) ||
        m.target?.classList?.contains(MANAGED_CLASS),
    );
    if (fromUs) return;
    refresh();
  });

  observer.observe(quill.root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-list"],
  });

  quill.on("text-change", refresh);
  quill.on("selection-change", refresh);
  refresh();

  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    quill.off("text-change", refresh);
    quill.off("selection-change", refresh);
  };
}

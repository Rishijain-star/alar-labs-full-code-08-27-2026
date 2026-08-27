/**
 * Font families & sizes for TipTap editor.
 * Add entries here for project-wide defaults, or use "Manage" in the toolbar
 * to persist custom options in localStorage.
 */

const STORAGE_FONTS = "pmp-editor-custom-font-families";
const STORAGE_SIZES = "pmp-editor-custom-font-sizes";

/** @typedef {{ label: string, value: string, googleFont?: string }} FontFamilyOption */
/** @typedef {{ label: string, value: string }} FontSizeOption */

/** @type {FontFamilyOption[]} */
export const BUILTIN_FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
  { label: "Inter", value: "Inter, sans-serif", googleFont: "Inter" },
  { label: "Roboto", value: "Roboto, sans-serif", googleFont: "Roboto" },
  { label: "Open Sans", value: '"Open Sans", sans-serif', googleFont: "Open Sans" },
  { label: "Lato", value: "Lato, sans-serif", googleFont: "Lato" },
  { label: "Poppins", value: "Poppins, sans-serif", googleFont: "Poppins" },
  { label: "Merriweather", value: "Merriweather, serif", googleFont: "Merriweather" },
  { label: "Fira Code", value: '"Fira Code", monospace', googleFont: "Fira Code" },
];

/** @type {FontSizeOption[]} */
export const BUILTIN_FONT_SIZES = [
  { label: "Default", value: "" },
  { label: "10px", value: "10px" },
  { label: "11px", value: "11px" },
  { label: "12px", value: "12px" },
  { label: "13px", value: "13px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "22px", value: "22px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "36px", value: "36px" },
  { label: "48px", value: "48px" },
  { label: "72px", value: "72px" },
];

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeJson(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

/** @returns {FontFamilyOption[]} */
export function getCustomFontFamilies() {
  return readJson(STORAGE_FONTS).filter((f) => f?.label && f?.value);
}

/** @param {FontFamilyOption} entry */
export function addCustomFontFamily(entry) {
  const list = getCustomFontFamilies();
  if (list.some((f) => f.value === entry.value)) return list;
  const next = [...list, entry];
  writeJson(STORAGE_FONTS, next);
  return next;
}

/** @returns {FontSizeOption[]} */
export function getCustomFontSizes() {
  return readJson(STORAGE_SIZES).filter((s) => s?.label && s?.value);
}

/** @param {FontSizeOption} entry */
export function addCustomFontSize(entry) {
  const list = getCustomFontSizes();
  if (list.some((s) => s.value === entry.value)) return list;
  const next = [...list, entry];
  writeJson(STORAGE_SIZES, next);
  return next;
}

/** @returns {FontFamilyOption[]} */
export function getAllFontFamilies() {
  const custom = getCustomFontFamilies();
  const builtinValues = new Set(BUILTIN_FONT_FAMILIES.map((f) => f.value));
  return [
    ...BUILTIN_FONT_FAMILIES,
    ...custom.filter((f) => !builtinValues.has(f.value)),
  ];
}

/** @returns {FontSizeOption[]} */
export function getAllFontSizes() {
  const custom = getCustomFontSizes();
  const builtinValues = new Set(BUILTIN_FONT_SIZES.map((s) => s.value));
  const merged = [
    ...BUILTIN_FONT_SIZES,
    ...custom.filter((s) => !builtinValues.has(s.value)),
  ];
  return merged.sort((a, b) => {
    if (!a.value) return -1;
    if (!b.value) return 1;
    const na = parseFloat(a.value);
    const nb = parseFloat(b.value);
    if (Number.isNaN(na) || Number.isNaN(nb)) return a.label.localeCompare(b.label);
    return na - nb;
  });
}

/** @param {string} cssValue e.g. "Inter, sans-serif" */
export function findFontOption(cssValue) {
  if (!cssValue) return null;
  return getAllFontFamilies().find((f) => f.value === cssValue) || null;
}

/**
 * Load a Google Font stylesheet when needed for editor preview & learner pages.
 * @param {FontFamilyOption | string} font
 */
export function ensureFontLoaded(font) {
  const option = typeof font === "string" ? findFontOption(font) : font;
  const googleName = option?.googleFont || null;
  if (!googleName || typeof document === "undefined") return;

  const id = `gfont-${googleName.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(googleName)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

/** Validate custom size: 8px–120px or 0.5rem–6rem */
export function normalizeFontSizeInput(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(px|rem|em|pt)?$/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  if (unit === "px" && (num < 8 || num > 120)) return null;
  if ((unit === "rem" || unit === "em") && (num < 0.5 || num > 6)) return null;
  if (unit === "pt" && (num < 6 || num > 96)) return null;
  return `${num}${unit}`;
}

/** Load Google Fonts referenced in saved HTML (learner / preview pages). */
export function ensureFontsFromHtml(html) {
  if (!html || typeof document === "undefined") return;
  const re = /font-family:\s*([^;"']+)/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const first = match[1].split(",")[0].trim().replace(/['"]/g, "");
    if (!first || /^(inherit|initial|unset|serif|sans-serif|monospace)$/i.test(first)) continue;
    ensureFontLoaded({ label: first, value: match[1].trim(), googleFont: first });
  }
}

/** @param {string} familyCss */
export function normalizeFontFamilyInput(label, familyCss) {
  const name = String(label || "").trim();
  const value = String(familyCss || "").trim();
  if (!name || !value) return null;
  return { label: name, value, googleFont: name.replace(/['"]/g, "") };
}

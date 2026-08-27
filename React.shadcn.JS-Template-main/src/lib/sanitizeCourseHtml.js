/**
 * Cleans course description HTML for public CourseDetail.
 * Handles pasted devtools CSS, Tailwind variable dumps, and full-page copy-paste.
 */

function decodeHtmlEntitiesOnce(str) {
  if (typeof str !== "string" || (!str.includes("&lt;") && !str.includes("&amp;"))) return str;
  try {
    const ta = typeof document !== "undefined" ? document.createElement("textarea") : null;
    if (ta) {
      ta.innerHTML = str;
      return ta.value;
    }
  } catch {
    /* ignore */
  }
  return str;
}

/** True if the string looks like CSS / devtools output rather than prose HTML. */
export function looksLikeCssOrDevToolsDump(str) {
  if (!str || typeof str !== "string") return false;
  const head = str.slice(0, 2500).trim();
  if (!head) return false;
  const lower = head.slice(0, 400).toLowerCase();
  const tw = (head.match(/--tw-[a-z-]+/gi) || []).length;
  const braces = (head.match(/\{/g) || []).length;
  const semi = (head.match(/;/g) || []).length;
  const hasRealHtml = /<\/(p|div|h[1-6]|ul|ol|li|section|article|br)\b/i.test(head);
  if (hasRealHtml && tw < 5 && braces < 15) return false;
  if (tw >= 8 || (braces >= 10 && semi >= 8)) return true;
  if (/^:root\s*\{/.test(head) || /^html\s*,\s*body/.test(lower)) return true;
  if (/^\s*\.[a-zA-Z0-9_-]+\s*\{/.test(head) && !/<p[\s>]/i.test(head.slice(0, 120))) return true;
  return false;
}

/** Remove leading lines that are clearly CSS until real content or HTML appears. */
function stripLeadingCssLines(str) {
  const lines = str.split(/\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t === "") {
      i++;
      continue;
    }
    if (/^<[a-z!/?]/i.test(t)) break;
    const isCssLine =
      /^(@media|@layer|@keyframes|@import|:root|html\s*\{|^\*|\/\*)/i.test(t) ||
      /^\s*[#.][a-zA-Z0-9_.#:\[\](),\s-]+\s*\{/.test(t) ||
      /^--[a-zA-Z0-9-]+\s*:/.test(t) ||
      (/^[a-zA-Z0-9_-]+\s*:\s*[^;]+;?\s*$/.test(t) && /:/.test(t)) ||
      (/^[\s}]*[{}][\s}]*$/.test(t) && t.length < 40);
    if (isCssLine) {
      i++;
      continue;
    }
    if (t.length < 500 && /[{};]/.test(t) && !/[.!?]/.test(t) && /:/.test(t)) {
      i++;
      continue;
    }
    break;
  }
  return lines.slice(i).join("\n").trim();
}

/**
 * Remove tags we never want in a marketing description, and trim pasted noise.
 */
export function sanitizeCourseDescriptionHtml(raw) {
  if (raw == null || raw === "") return "";
  let s = decodeHtmlEntitiesOnce(String(raw));

  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<\/?(html|head|body)\b[^>]*>/gi, "");
  s = s.replace(/<meta\b[^>]*>/gi, "");
  s = s.replace(/<link\b[^>]*>/gi, "");
  s = s.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "");

  if (looksLikeCssOrDevToolsDump(s)) {
    const cut = s.search(/<(p|div|h[1-6]|ul|ol|section|article|blockquote)\b/i);
    if (cut > 0) s = s.slice(cut);
    else s = stripLeadingCssLines(s);
  }

  s = stripLeadingCssLines(s);

  return s.trim();
}

/**
 * Prefer the best field for display: sanitized full, else description, else short.
 */
export function pickCourseDescriptionHtml(detail) {
  if (!detail || typeof detail !== "object") return "";
  const full = detail.fullDescription;
  const desc = detail.description;
  const short = detail.shortDescription;

  let primary = sanitizeCourseDescriptionHtml(full || desc || short || "");
  if (!primary || looksLikeCssOrDevToolsDump(primary)) {
    primary = sanitizeCourseDescriptionHtml(desc || "");
  }
  if (!primary || looksLikeCssOrDevToolsDump(primary)) {
    primary = sanitizeCourseDescriptionHtml(short || "");
  }
  if (looksLikeCssOrDevToolsDump(primary)) {
    return "";
  }
  return primary;
}

/** Strip HTML tags to plain text */
export function stripHtmlTags(html = "") {
  if (!html) return "";
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").trim();
  }
  return String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** First heading or strong line from rich text HTML */
export function extractHeadingFromHtml(html = "") {
  if (!html) return "";
  const hMatch = String(html).match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (hMatch) return stripHtmlTags(hMatch[1]);
  const strongMatch = String(html).match(/<p[^>]*>\s*<strong>([\s\S]*?)<\/strong>/i);
  if (strongMatch) return stripHtmlTags(strongMatch[1]);
  const firstP = String(html).match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (firstP) {
    const text = stripHtmlTags(firstP[1]);
    if (text.length > 0 && text.length <= 80) return text;
  }
  return "";
}

/** Display title for rich text blocks in outlines and sidebars */
export function getRichTextBlockTitle(block = {}) {
  if (block.title && String(block.title).trim()) {
    return String(block.title).trim();
  }
  const fromHtml = extractHeadingFromHtml(block.content || block.html);
  if (fromHtml) return fromHtml;
  return "Reading";
}

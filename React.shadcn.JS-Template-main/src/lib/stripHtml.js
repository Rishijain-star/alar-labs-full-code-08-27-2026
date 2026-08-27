/** Strip HTML tags and collapse whitespace for card/list previews. */
export function stripHtmlToPlain(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCount(n, singular, plural) {
  const num = Number(n) || 0;
  const label = num === 1 ? singular : plural || `${singular}s`;
  return `${num} ${label}`;
}

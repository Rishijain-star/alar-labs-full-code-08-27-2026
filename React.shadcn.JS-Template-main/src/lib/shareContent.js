/** Build approval-preview share URL for courses or labs. */
export function buildApprovalPreviewUrl(kind, slug) {
  const safeSlug = typeof slug === "string" ? slug.trim() : "";
  if (!safeSlug) return "";
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const segment = kind === "course" ? "courses" : "labs";
  return `${base}/approval-preview/${segment}/${encodeURIComponent(safeSlug)}`;
}

export async function copyShareLink(url) {
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export function openSocialShare(platform, url, title = "") {
  if (!url) return;
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title || url);
  const targets = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    twitter: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    whatsapp: `https://wa.me/?text=${text}%20${encoded}`,
  };
  const target = targets[platform];
  if (target) window.open(target, "_blank", "noopener,noreferrer,width=600,height=500");
}

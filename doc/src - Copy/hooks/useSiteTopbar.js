import { useEffect, useMemo, useState } from "react";
import { useGetPublicBrandingQuery } from "@/store/api/siteContentApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const STORAGE_KEY = "alar_site_topbar_dismissed";

export function useSiteTopbar() {
  const { data } = useGetPublicBrandingQuery(undefined, { refetchOnMountOrArgChange: false });
  const branding = data?.data?.branding;
  const active = branding?.topbar_active;
  const text = (branding?.topbar_text || "").trim();
  /** Raw path from API — use in signature so dismiss survives refresh (resolved URL can vary). */
  const rawImagePath = (branding?.topbar_image_url || "").trim();
  const imageUrl = rawImagePath ? resolveMediaUrl(rawImagePath) : "";

  const signature = useMemo(() => `${text}|${rawImagePath}`, [text, rawImagePath]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === signature);
    } catch {
      setDismissed(false);
    }
  }, [signature]);

  const visible = !!(active && !dismissed && (text || imageUrl));

  return {
    visible,
    branding,
    text,
    imageUrl,
    signature,
    dismiss: () => {
      try {
        localStorage.setItem(STORAGE_KEY, signature);
      } catch {
        /* ignore */
      }
      setDismissed(true);
    },
  };
}

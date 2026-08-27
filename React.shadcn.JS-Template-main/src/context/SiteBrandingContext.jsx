import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useGetPublicBrandingQuery } from "@/store/api/siteContentApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export const SITE_FALLBACK_LOGO = "/alarlabslogo.png";

const SiteBrandingContext = createContext(null);

export function SiteBrandingProvider({ children }) {
  const { data, isLoading, isFetching, isError, isSuccess } = useGetPublicBrandingQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const branding = data?.data?.branding;

  const resolvedLogoFromApi = useMemo(() => {
    const raw = branding?.logo_url ? String(branding.logo_url).trim() : "";
    return raw ? resolveMediaUrl(raw) : "";
  }, [branding?.logo_url]);

  const resolvedFaviconHref = useMemo(() => {
    const raw = branding?.favicon_url ? String(branding.favicon_url).trim() : "";
    return raw ? resolveMediaUrl(raw) : "";
  }, [branding?.favicon_url]);

  const [faviconAssetReady, setFaviconAssetReady] = useState(false);

  useEffect(() => {
    if (isError) {
      setFaviconAssetReady(true);
      return;
    }
    if (!isSuccess && (isLoading || isFetching)) return;
    if (!resolvedFaviconHref) {
      setFaviconAssetReady(true);
      return;
    }
    setFaviconAssetReady(false);
    const img = new Image();
    const done = () => setFaviconAssetReady(true);
    img.onload = done;
    img.onerror = done;
    img.src = resolvedFaviconHref;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isError, isSuccess, isLoading, isFetching, resolvedFaviconHref]);

  useEffect(() => {
    if (!resolvedFaviconHref) return;
    const links = document.querySelectorAll("link[rel~='icon']");
    links.forEach((el) => el.setAttribute("href", resolvedFaviconHref));
  }, [resolvedFaviconHref]);

  const displayLogoUrl = resolvedLogoFromApi || SITE_FALLBACK_LOGO;

  const showLogoSkeleton =
    !isError &&
    ((!isSuccess && (isLoading || isFetching)) || (isSuccess && !faviconAssetReady));

  const value = useMemo(
    () => ({
      branding,
      displayLogoUrl,
      showLogoSkeleton,
      resolvedFaviconHref,
    }),
    [branding, displayLogoUrl, showLogoSkeleton, resolvedFaviconHref]
  );

  return <SiteBrandingContext.Provider value={value}>{children}</SiteBrandingContext.Provider>;
}

export function useSiteBranding() {
  const ctx = useContext(SiteBrandingContext);
  if (!ctx) {
    throw new Error("useSiteBranding must be used within SiteBrandingProvider");
  }
  return ctx;
}

/** Safe for optional branding (e.g. Storybook); returns fallbacks when provider missing. */
export function useSiteBrandingOptional() {
  return useContext(SiteBrandingContext);
}

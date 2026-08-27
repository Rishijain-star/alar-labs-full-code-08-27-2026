import { cn } from "@/lib/utils";

/** Fixed SiteTopBar height — must match `SiteTopBar` (`h-10`) and `Navbar` `top-10`. */
export const SITE_TOPBAR_HEIGHT = "2.5rem";

/** Full-screen learning (course/lab/skill-builder workspace) — hide public site header. */
export function isImmersiveLearningRoute(pathname = "") {
  if (!pathname) return false;
  return (
    /^\/labs\/[^/]+\/(start|run)$/.test(pathname) ||
    /^\/courses\/[^/]+\/learn$/.test(pathname)
  );
}

/** Padding so page content starts below fixed SiteTopBar + Navbar. */
export function siteContentOffsetClass(hasTopbar, pathname = "") {
  if (isImmersiveLearningRoute(pathname)) return "min-h-screen";
  return hasTopbar
    ? "pt-[calc(2.5rem+4rem)] sm:pt-[calc(2.5rem+5rem)]"
    : "pt-16 sm:pt-20";
}

/** `position: sticky` top offset so sub-headers sit below the fixed site header. */
export function siteStickyBelowNavClass(hasTopbar, pathname = "") {
  if (isImmersiveLearningRoute(pathname)) return "top-0";
  return hasTopbar
    ? "top-[calc(2.5rem+4rem)] sm:top-[calc(2.5rem+5rem)]"
    : "top-16 sm:top-20";
}

/** Full-viewport height minus fixed site header (for chat / workspace shells). */
export function siteViewportBelowNavHeightClass(hasTopbar) {
  return hasTopbar
    ? "h-[calc(100dvh-2.5rem-4rem)] sm:h-[calc(100dvh-2.5rem-5rem)]"
    : "h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-5rem)]";
}

export function siteContentOffset(hasTopbar, pathname = "", ...extra) {
  return cn(siteContentOffsetClass(hasTopbar, pathname), ...extra);
}

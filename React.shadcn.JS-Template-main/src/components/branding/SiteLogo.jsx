import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SITE_FALLBACK_LOGO, useSiteBrandingOptional } from "@/context/SiteBrandingContext";
import { usePlatformSettingsOptional } from "@/context/PlatformSettingsContext";

const variants = {
  default: {
    title: "text-base sm:text-lg font-bold leading-tight truncate text-foreground",
    tagline: "text-[10px] leading-none hidden sm:block text-muted-foreground",
    skeletonBox: "w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted",
    skeletonTitle: "h-4 w-28 bg-muted",
    skeletonTag: "h-3 w-36 bg-muted/70",
  },
  footer: {
    title: "text-lg font-bold text-background",
    tagline: "text-[10px] leading-none hidden sm:block text-background/70",
    skeletonBox: "w-9 h-9 rounded-lg bg-background/20",
    skeletonTitle: "h-4 w-28 bg-background/20",
    skeletonTag: "h-3 w-36 bg-background/15",
  },
  inverse: {
    title: "text-lg font-bold leading-tight text-white",
    tagline: "text-[10px] leading-none hidden sm:block text-white/75",
    skeletonBox: "w-9 h-9 rounded-lg bg-white/15",
    skeletonTitle: "h-4 w-28 bg-white/20",
    skeletonTag: "h-3 w-36 bg-white/15",
  },
  compact: {
    title: "text-xl font-semibold text-foreground",
    tagline: "sr-only",
    skeletonBox: "w-10 h-10 rounded-lg bg-muted",
    skeletonTitle: "h-5 w-32 bg-muted",
    skeletonTag: "hidden",
  },
  admin: {
    title: "text-sm font-semibold text-foreground",
    tagline: "sr-only",
    skeletonBox: "h-8 w-8 rounded-lg bg-muted",
    skeletonTitle: "h-4 w-24 bg-muted",
    skeletonTag: "hidden",
  },
};

/**
 * Same image as navbar everywhere (driven by public site branding + favicon preload gate).
 */
export function SiteLogo({
  to = "/",
  onClick,
  className,
  imgClassName,
  showTagline = true,
  variant = "default",
  collapsed = false,
  "aria-label": ariaLabel = "Home",
}) {
  const ctx = useSiteBrandingOptional();
  const platform = usePlatformSettingsOptional();
  const siteName = platform?.siteName || "ALAR Labs";
  const displayLogoUrl = ctx?.displayLogoUrl ?? SITE_FALLBACK_LOGO;
  const showLogoSkeleton = ctx?.showLogoSkeleton ?? false;
  const v = variants[variant] || variants.default;

  const imgClasses = cn(
    "rounded-lg object-contain shadow-sm shrink-0",
    variant === "footer" && "shadow-none",
    variant === "inverse" && "shadow-md ring-1 ring-white/20",
    variant === "compact" && "w-10 h-10",
    variant !== "compact" && (collapsed ? "h-8 w-8" : "w-8 h-8 sm:w-9 sm:h-9"),
    imgClassName
  );

  const body = (
    <>
      {showLogoSkeleton ? (
        <div
          className={cn(
            "animate-pulse shrink-0 rounded-lg",
            variant === "compact" && "h-10 w-10 bg-muted",
            variant !== "compact" && (collapsed ? "h-8 w-8 bg-muted" : v.skeletonBox)
          )}
          aria-hidden
        />
      ) : (
        <img
          src={displayLogoUrl}
          alt={siteName}
          className={imgClasses}
          onError={(e) => {
            e.currentTarget.src = SITE_FALLBACK_LOGO;
          }}
        />
      )}
      {!collapsed && (
        <div className="flex flex-col min-w-0 text-left">
          {showLogoSkeleton ? (
            <>
              <div className={cn(v.skeletonTitle, "animate-pulse rounded mb-1")} aria-hidden />
              {showTagline && variant !== "compact" && variant !== "admin" && (
                <div className={cn(v.skeletonTag, "hidden sm:block animate-pulse rounded")} aria-hidden />
              )}
            </>
          ) : (
            <>
              <span className={v.title}>{siteName}</span>
              {showTagline && variant !== "compact" && variant !== "admin" && (
                <span className={v.tagline}>Learning & Innovation</span>
              )}
            </>
          )}
        </div>
      )}
    </>
  );

  const wrapClass = cn("flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0", className);

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={wrapClass} aria-label={ariaLabel}>
        {body}
      </Link>
    );
  }

  return (
    <span className={wrapClass} role="img" aria-label={ariaLabel}>
      {body}
    </span>
  );
}

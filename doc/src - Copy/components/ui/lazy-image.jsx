import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Image with native lazy-loading, async decode, and a lightweight blur placeholder.
 * Use for catalog cards and list thumbnails to improve LCP and bandwidth.
 */
export function LazyImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  ...imgProps
}) {
  const [loaded, setLoaded] = useState(false);
  if (!src) {
    return (
      <div
        className={cn("bg-muted animate-pulse", wrapperClassName)}
        aria-hidden
      />
    );
  }
  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        fetchPriority={imgProps.fetchPriority ?? "low"}
        onLoad={() => setLoaded(true)}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...imgProps}
      />
    </div>
  );
}

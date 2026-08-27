import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Cloud / vendor platform label (AWS, Docker, custom, etc.) */
export default function PlatformBadge({ platform, className, variant = "outline" }) {
  const label = String(platform || "").trim();
  if (!label) return null;
  return (
    <Badge
      variant={variant}
      className={cn(
        "text-xs font-semibold border-sky-200 bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800",
        className
      )}
    >
      {label}
    </Badge>
  );
}

export function PlatformHeroBadge({ platform, className }) {
  const label = String(platform || "").trim();
  if (!label) return null;
  return (
    <span
      className={cn(
        "bg-sky-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm tracking-wide",
        className
      )}
    >
      {label}
    </span>
  );
}

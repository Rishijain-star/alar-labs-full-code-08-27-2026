import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * ProgressBar (shadcn Progress wrapper)
 * - progress: number (0-100)
 * Notes:
 * - Uses opacity to hide at 0 so we don't see the reverse animation (100 -> 0).
 * - Track uses bg-secondary, indicator uses bg-primary.
 * - Make sure your tailwind theme has bg-secondary / bg-primary classes, otherwise replace them.
 */
export default function ProgressBar({ progress = 0 }) {
  const p = Math.max(0, Math.min(100, Number(progress || 0)));
  const isVisible = p > 0;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 h-1 z-50 transition-opacity duration-200 pointer-events-none",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={!isVisible}
    >
      <Progress
        value={p}
        className="h-1 bg-secondary rounded-full" // track background

      />
    </div>
  );
}

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Props must come from the parent’s single `useSiteTopbar()` call so dismiss stays in sync with `Navbar` offset. */
export function SiteTopBar({ visible, text, imageUrl, dismiss }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[60] border-b border-orange-600",
        "bg-orange-500 text-white text-sm shadow-sm"
      )}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center gap-3 min-h-10">
        <div className="flex-1 flex flex-wrap items-center gap-3 min-w-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-7 w-auto max-w-[120px] object-contain shrink-0 rounded-sm bg-white/15"
            />
          ) : null}
          {text ? <p className="leading-snug break-words font-medium">{text}</p> : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1.5 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <span ref={bottomRef} className="sr-only" />
    </div>
  );
}

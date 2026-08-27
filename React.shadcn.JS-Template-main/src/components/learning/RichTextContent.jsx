import { useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { prepareQuillHtmlForDisplay } from "@/lib/prepareQuillHtml";
import { ensureFontsFromHtml } from "@/lib/tiptap/fontConfig";

/**
 * Renders stored rich text HTML with consistent typography.
 * @param {"default"|"onDark"} variant - `onDark` for hero bands on dark gradients.
 */
export default function RichTextContent({
  html = "",
  title,
  className,
  contentClassName,
  showTitle = true,
  variant = "default",
}) {
  const content = html || "";
  const preparedHtml = useMemo(
    () => prepareQuillHtmlForDisplay(content),
    [content],
  );

  useEffect(() => {
    ensureFontsFromHtml(preparedHtml);
  }, [preparedHtml]);

  if (!content && !title) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {showTitle && title ? (
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      ) : null}
      {content ? (
        <div
          className={cn(
            "rich-text-content",
            variant === "onDark" && "rich-text-content-on-dark",
            contentClassName,
          )}
          dangerouslySetInnerHTML={{ __html: preparedHtml }}
        />
      ) : null}
    </div>
  );
}

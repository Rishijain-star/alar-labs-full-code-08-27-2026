import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildOutlineHtmlFromText,
  OUTLINE_PLACEHOLDER,
  parseOutlineText,
} from "@/lib/outlineListParser";

export default function OutlineListDialog({
  open,
  onOpenChange,
  onInsert,
  initialText = "",
}) {
  const [text, setText] = useState(OUTLINE_PLACEHOLDER);

  useEffect(() => {
    if (open) {
      setText(initialText?.trim() ? initialText : OUTLINE_PLACEHOLDER);
    }
  }, [open, initialText]);

  const previewItems = useMemo(() => parseOutlineText(text), [text]);

  const handleInsert = () => {
    const html = buildOutlineHtmlFromText(text);
    if (!html?.trim()) return;
    onInsert?.(html);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle>Structured outline list</DialogTitle>
          <DialogDescription>
            Type your outline below. Use <strong>Tab</strong> or{" "}
            <strong>2 spaces</strong> per level: numbers → letters → roman (i,
            ii). Double-click an outline in the editor to edit it.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Outline text
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              placeholder={OUTLINE_PLACEHOLDER}
            />
          </div>

          {previewItems.length > 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="mb-2 font-semibold text-slate-700">Levels detected</p>
              <ul className="space-y-1">
                {previewItems.map((item, idx) => (
                  <li
                    key={`${idx}-${item.text}`}
                    style={{ paddingLeft: `${item.level * 1.25}rem` }}
                  >
                    Level {item.level + 1}: {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!previewItems.length}>
            Insert outline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

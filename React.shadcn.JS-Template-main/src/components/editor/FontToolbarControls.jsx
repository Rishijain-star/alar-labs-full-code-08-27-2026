import { useEffect, useMemo, useState } from "react";
import { Type, WholeWord, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCustomFontFamily,
  addCustomFontSize,
  ensureFontLoaded,
  getAllFontFamilies,
  getAllFontSizes,
  normalizeFontFamilyInput,
  normalizeFontSizeInput,
} from "@/lib/tiptap/fontConfig";

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-300" />;
}

function selectClassName() {
  return "h-8 max-w-[9.5rem] truncate rounded border border-slate-300 bg-white px-2 text-sm text-slate-700";
}

export default function FontToolbarControls({ editor }) {
  const [revision, setRevision] = useState(0);
  const [manageOpen, setManageOpen] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [customFontLabel, setCustomFontLabel] = useState("");
  const [customFontValue, setCustomFontValue] = useState("");
  const [docFontOpen, setDocFontOpen] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setRevision((n) => n + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  const fontFamilies = useMemo(() => getAllFontFamilies(), [revision, manageOpen]);
  const fontSizes = useMemo(() => getAllFontSizes(), [revision, manageOpen]);

  if (!editor) return null;

  const currentFamily = editor.getAttributes("textStyle").fontFamily || "";
  const currentSize = editor.getAttributes("textStyle").fontSize || "";

  const applyFontFamily = (value) => {
    if (!value) {
      editor.chain().focus().unsetFontFamily().run();
      return;
    }
    const option = fontFamilies.find((f) => f.value === value);
    if (option) ensureFontLoaded(option);
    editor.chain().focus().setFontFamily(value).run();
  };

  const applyFontSize = (value) => {
    if (!value) {
      editor.chain().focus().unsetFontSize().run();
      return;
    }
    editor.chain().focus().setFontSize(value).run();
  };

  const applyDocumentFont = (value) => {
    if (!value) {
      editor.chain().focus().setDocumentFontFamily("").run();
    } else {
      const option = fontFamilies.find((f) => f.value === value);
      if (option) ensureFontLoaded(option);
      editor.chain().focus().setDocumentFontFamily(value).run();
    }
    setDocFontOpen(false);
  };

  const handleAddCustomSize = () => {
    const normalized = normalizeFontSizeInput(customSize);
    if (!normalized) {
      window.alert("Enter a valid size (e.g. 22px, 1.25rem). Range: 8–120px.");
      return;
    }
    addCustomFontSize({ label: normalized, value: normalized });
    setCustomSize("");
    setRevision((n) => n + 1);
    applyFontSize(normalized);
  };

  const handleAddCustomFont = () => {
    const entry = normalizeFontFamilyInput(customFontLabel, customFontValue);
    if (!entry) {
      window.alert("Enter a display name and CSS font-family value.");
      return;
    }
    addCustomFontFamily(entry);
    ensureFontLoaded(entry);
    setCustomFontLabel("");
    setCustomFontValue("");
    setRevision((n) => n + 1);
    applyFontFamily(entry.value);
  };

  return (
    <>
      <ToolbarDivider />

      <select
        className={selectClassName()}
        title="Font family (selected text)"
        value={currentFamily}
        onChange={(e) => applyFontFamily(e.target.value)}
        style={currentFamily ? { fontFamily: currentFamily } : undefined}
      >
        {fontFamilies.map((f) => (
          <option key={f.value || "default"} value={f.value} style={f.value ? { fontFamily: f.value } : undefined}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        className={cn(selectClassName(), "max-w-[5.5rem]")}
        title="Font size (selected text)"
        value={currentSize}
        onChange={(e) => applyFontSize(e.target.value)}
      >
        {fontSizes.map((s) => (
          <option key={s.value || "default"} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Popover open={docFontOpen} onOpenChange={setDocFontOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Apply font family to entire document"
            onMouseDown={(e) => e.preventDefault()}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded border border-transparent px-1.5 text-slate-700 hover:bg-slate-200"
          >
            <WholeWord className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-[200] w-56 p-2" align="start">
          <p className="mb-2 px-1 text-xs font-semibold text-slate-600">
            Entire document font
          </p>
          <div className="grid max-h-48 gap-1 overflow-y-auto">
            {fontFamilies.map((f) => (
              <button
                key={`doc-${f.value || "default"}`}
                type="button"
                onClick={() => applyDocumentFont(f.value)}
                className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                style={f.value ? { fontFamily: f.value } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-[10px] leading-snug text-slate-500">
            Applies the font family to all text in this editor. Existing bold, lists, and images are unchanged.
          </p>
        </PopoverContent>
      </Popover>

      <Popover open={manageOpen} onOpenChange={setManageOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Add custom fonts & sizes"
            onMouseDown={(e) => e.preventDefault()}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded border border-transparent px-1.5 text-slate-700 hover:bg-slate-200"
          >
            <Type className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-[200] w-72 p-3" align="start">
          <p className="mb-3 text-xs font-semibold text-slate-600">
            Custom font & size
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Custom size</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 22px"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSize();
                    }
                  }}
                />
                <Button type="button" size="sm" className="h-8 shrink-0" onClick={handleAddCustomSize}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              <Label className="text-xs">Custom font family</Label>
              <Input
                placeholder="Display name (e.g. Poppins)"
                value={customFontLabel}
                onChange={(e) => setCustomFontLabel(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder={'CSS value (e.g. "Poppins", sans-serif)'}
                value={customFontValue}
                onChange={(e) => setCustomFontValue(e.target.value)}
                className="h-8 text-sm"
              />
              <Button type="button" size="sm" className="h-8 w-full" onClick={handleAddCustomFont}>
                Add font family
              </Button>
              <p className="text-[10px] leading-snug text-slate-500">
                For Google Fonts, use the font name as display name. It will load automatically in the editor.
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

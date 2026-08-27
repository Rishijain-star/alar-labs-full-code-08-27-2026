import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
import QuillRichEditor from "@/components/editor/QuillRichEditor";

/**
 * Shared rich text block editor for courses, normal labs, and skill builder labs.
 * Includes a block title field shown in overview outlines.
 */
export default function RichTextBlockEditor({ block, onChange }) {
  const update = useCallback(
    (updates) => onChange({ ...block, ...updates }),
    [block, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-200">
        <FileText className="w-5 h-5 text-slate-600" />
        <h3 className="font-bold text-slate-900">Rich Text Block</h3>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          Block title{" "}
          <span className="text-slate-400 font-normal">(shown in course/lab overview)</span>
        </label>
        <Input
          value={block.title || ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="e.g. Introduction to React Hooks"
          className="bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Content</label>
        <QuillRichEditor
          editorKey={block.id}
          value={block.content || ""}
          onChange={(html) => update({ content: html })}
          placeholder="Write your lesson content here…"
          minHeight={200}
          maxHeight={360}
          compact
        />
        <p className="text-xs text-slate-500 mt-1">
          Multi-level lists (1 → a → i) use the <strong>1a</strong> button or
          numbered list + indent — they auto-convert to hierarchy format. Double-click
          an outline block to edit.
        </p>
      </div>
    </div>
  );
}

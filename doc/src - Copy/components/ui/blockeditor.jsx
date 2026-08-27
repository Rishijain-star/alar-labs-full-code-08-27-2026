// src/components/lab/BlockEditor.jsx
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichEditor } from "@/components/ui/richeditor";
import { MediaUploader } from "@/components/ui/media-uploader";
import { cn } from "@/lib/utils";

const CODE_LANGS = ["bash", "yaml", "json", "python", "javascript", "typescript", "sql", "dockerfile", "hcl", "go", "rust", "java"];
const BANNER_VARIANTS = ["info", "warning", "success", "tip"];
const MEDIA_TYPES = ["image", "video", "youtube"];
const NOTE_COLORS = [
    { label: "Yellow", value: "#fef9c3" },
    { label: "Blue", value: "#e0f2fe" },
    { label: "Green", value: "#dcfce7" },
    { label: "Pink", value: "#fce7f3" },
    { label: "Gray", value: "#f3f4f6" },
];

export const BLOCK_META = {
    para: { label: "¶ Paragraph", bg: "bg-slate-50" },
    label: { label: "🏷 Label", bg: "bg-amber-50" },
    code: { label: "</> Code", bg: "bg-zinc-50" },
    list: { label: "• List", bg: "bg-blue-50" },
    table: { label: "⊞ Table", bg: "bg-green-50" },
    banner: { label: "⚑ Banner", bg: "bg-purple-50" },
    note_box: { label: "📝 Note", bg: "bg-yellow-50" },
    media: { label: "🖼 Media", bg: "bg-pink-50" },
};

/**
 * BlockEditor — renders a single editable content block
 *
 * Props:
 *   block     object
 *   onUpdate  (updatedBlock) => void
 *   onRemove  () => void
 */
export function BlockEditor({ block, onUpdate, onRemove }) {
    const upd = (f, v) => onUpdate({ ...block, [f]: v });
    const m = BLOCK_META[block.type] || { label: block.type, bg: "bg-muted/20" };

    return (
        <div className={cn("border border-border rounded-lg overflow-hidden mb-2", m.bg)}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
                <span className="text-xs font-semibold text-muted-foreground">{m.label}</span>
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={onRemove}>
                    <X className="w-3 h-3" />
                </Button>
            </div>

            <div className="p-3">
                {/* Paragraph */}
                {block.type === "para" && (
                    <RichEditor
                        value={block.text || ""}
                        onChange={v => upd("text", v)}
                        placeholder="Paragraph text... (select text then B/I/U or color)"
                    />
                )}

                {/* Label */}
                {block.type === "label" && (
                    <Input
                        value={block.text || ""}
                        onChange={e => upd("text", e.target.value)}
                        placeholder="Label text"
                        className="bg-white h-8 text-sm"
                    />
                )}

                {/* Code */}
                {block.type === "code" && (
                    <div className="space-y-2">
                        <Select value={block.language || "bash"} onValueChange={v => upd("language", v)}>
                            <SelectTrigger className="bg-white h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{CODE_LANGS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                        <textarea
                            value={block.code || ""}
                            onChange={e => upd("code", e.target.value)}
                            placeholder="Paste code..."
                            rows={5}
                            className="w-full rounded-lg p-3 text-xs font-mono resize-y outline-none border border-border"
                            style={{ background: "#1e1e2e", color: "#cdd6f4" }}
                        />
                    </div>
                )}

                {/* List */}
                {block.type === "list" && (
                    <div className="space-y-1.5">
                        {(block.items || [""]).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <span className="text-muted-foreground text-sm">•</span>
                                <Input
                                    value={item}
                                    onChange={e => upd("items", (block.items || []).map((it, j) => j === i ? e.target.value : it))}
                                    placeholder={`Item ${i + 1}`}
                                    className="bg-white h-7 text-sm flex-1"
                                />
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                    onClick={() => upd("items", (block.items || []).filter((_, j) => j !== i))}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-primary mt-1"
                            onClick={() => upd("items", [...(block.items || []), ""])}>
                            <Plus className="w-3 h-3 mr-1" />Add Item
                        </Button>
                    </div>
                )}

                {/* Table */}
                {block.type === "table" && (
                    <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Each row = [Setting, Value]</p>
                        {(block.rows || []).map((row, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input value={row[0]} onChange={e => upd("rows", block.rows.map((r, j) => j === i ? [e.target.value, r[1]] : r))}
                                    placeholder="Setting" className="bg-white h-7 text-sm flex-1" />
                                <Input value={row[1]} onChange={e => upd("rows", block.rows.map((r, j) => j === i ? [r[0], e.target.value] : r))}
                                    placeholder="Value" className="bg-white h-7 text-sm flex-1" />
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                    onClick={() => upd("rows", block.rows.filter((_, j) => j !== i))}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-primary mt-1"
                            onClick={() => upd("rows", [...(block.rows || []), ["", ""]])}>
                            <Plus className="w-3 h-3 mr-1" />Add Row
                        </Button>
                    </div>
                )}

                {/* Banner */}
                {block.type === "banner" && (
                    <div className="flex gap-2">
                        <Select value={block.variant || "info"} onValueChange={v => upd("variant", v)}>
                            <SelectTrigger className="bg-white h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{BANNER_VARIANTS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input value={block.text || ""} onChange={e => upd("text", e.target.value)}
                            placeholder="Banner message..." className="bg-white h-8 text-sm flex-1" />
                    </div>
                )}

                {/* Media */}
                {block.type === "media" && (
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <Select value={block.mediaType || "image"} onValueChange={v => upd("mediaType", v)}>
                                <SelectTrigger className="bg-white h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{MEDIA_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input value={block.caption || ""} onChange={e => upd("caption", e.target.value)}
                                placeholder="Caption (optional)" className="bg-white h-8 text-sm flex-1" />
                        </div>
                        <MediaUploader
                            accept={block.mediaType === "video" ? "video" : "image"}
                            value={null}
                            previewUrl={block.src || ""}
                            onChange={(f) => {
                                if (f) {
                                    onUpdate({
                                        ...block,
                                        src: URL.createObjectURL(f),
                                        _pendingFile: f,
                                    });
                                } else {
                                    onUpdate({ ...block, src: "", _pendingFile: undefined });
                                }
                            }}
                            showPreview
                        />
                    </div>
                )}

                {/* Note box */}
                {block.type === "note_box" && (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                            {NOTE_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    title={c.label}
                                    className="w-7 h-7 rounded border border-border"
                                    style={{ background: c.value }}
                                    onClick={() => upd("backgroundColor", c.value)}
                                />
                            ))}
                        </div>
                        <RichEditor
                            value={block.html || ""}
                            onChange={(v) => upd("html", v)}
                            placeholder="Note text... (supports highlights/colors)"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default BlockEditor;
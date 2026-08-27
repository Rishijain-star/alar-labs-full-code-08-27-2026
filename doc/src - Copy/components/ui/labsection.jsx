// src/components/lab/LabSection.jsx
import { useState } from "react";
import { GripVertical, ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlockEditor, BLOCK_META } from "@/components/ui/blockeditor";
import { FieldLabel } from "@/components/ui/fieldlabel";
import { MediaUploader } from "@/components/ui/media-uploader";
import { cn } from "@/lib/utils";

let _uid = 0;
const uid = () => `id_${++_uid}_${Math.random().toString(36).slice(2, 6)}`;

const SECTION_STYLE = {
    heading: "border-slate-200 bg-slate-50/50",
    content: "border-cyan-200 bg-cyan-50/25",
    step: "border-blue-200   bg-blue-50/30",
    media: "border-purple-200 bg-purple-50/30",
    congrats: "border-green-200  bg-green-50/30",
};

const SECTION_LABEL = (s) => {
    if (s.type === "heading" && s.level === "title") return "📰 Title";
    return ({
    heading: "📌 Heading",
    content: "📄 Content",
    step: `🔢 Step ${s.stepNumber || ""}`,
    media: "🖼 Media",
    congrats: "🎉 Congratulations",
}[s.type] || s.type);
};

/**
 * LabSection — heading / step / media / congrats block
 *
 * Props:
 *   section   object
 *   index     number
 *   total     number
 *   onUpdate  (updated) => void
 *   onRemove  () => void
 *   onMove    (dir: -1|1) => void
 *   reorderMode  "buttons" | "dnd" — hide ↑↓ when using drag-and-drop
 *   dragAttributes, dragListeners — from @dnd-kit useSortable (handle only)
 */
export function LabSection({
    section,
    index,
    total,
    onUpdate,
    onRemove,
    onMove,
    reorderMode = "buttons",
    dragAttributes,
    dragListeners,
}) {
    const [collapsed, setCollapsed] = useState(false);
    const upd = (f, v) => onUpdate({ ...section, [f]: v });

    const addBlock = (type) => {
        const defs = {
            para: { type: "para", text: "" },
            label: { type: "label", text: "" },
            code: { type: "code", language: "bash", code: "" },
            list: { type: "list", items: [""] },
            table: { type: "table", rows: [["", ""]] },
            banner: { type: "banner", variant: "info", text: "" },
            media: { type: "media", src: "", mediaType: "image", caption: "" },
        };
        upd("blocks", [...(section.blocks || []), { id: uid(), ...defs[type] }]);
    };

    const updateBlock = (id, updated) =>
        upd("blocks", (section.blocks || []).map(b => b.id === id ? { ...updated, id } : b));
    const removeBlock = (id) =>
        upd("blocks", (section.blocks || []).filter(b => b.id !== id));

    return (
        <div className={cn("border rounded-xl overflow-hidden mb-3", SECTION_STYLE[section.type] || "border-border bg-white")}>
            {/* Bar */}
            <div className="flex items-center gap-2 px-4 py-2.5">
                <button
                    type="button"
                    className={cn(
                        "touch-none flex-shrink-0 rounded p-0.5 text-muted-foreground/70 hover:text-foreground",
                        dragListeners ? "cursor-grab active:cursor-grabbing" : "cursor-grab"
                    )}
                    aria-label="Drag to reorder"
                    {...(dragAttributes || {})}
                    {...(dragListeners || {})}
                >
                    <GripVertical className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-border text-muted-foreground flex-shrink-0">
                    {SECTION_LABEL(section)}
                </span>
                <span className="flex-1 text-sm font-medium truncate text-foreground">
                    {section.type === "heading" && (section.text || <em className="text-muted-foreground font-normal">Untitled heading</em>)}
                    {section.type === "content" && (section.title?.trim() || <em className="text-muted-foreground font-normal">Untitled content block</em>)}
                    {section.type === "step" && (`Step ${section.stepNumber || ""}: ${section.title || ""}` || <em className="text-muted-foreground font-normal">Untitled step</em>)}
                    {section.type === "media" && (section.src ? "Media" : <em className="text-muted-foreground font-normal">No source set</em>)}
                    {section.type === "congrats" && "Congratulations banner"}
                </span>
                <div className="flex items-center gap-0.5 ml-auto">
                    {reorderMode === "buttons" && (
                        <>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(-1)} disabled={index === 0}>
                                <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(1)} disabled={index === total - 1}>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(c => !c)}>
                        {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={onRemove}>
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {!collapsed && (
                <div className="px-4 pb-4 pt-1 border-t border-border/40">
                    {/* ── Heading ── */}
                    {section.type === "heading" && (
                        <div className="grid grid-cols-3 gap-3 pt-3">
                            <div className="col-span-2">
                                <FieldLabel>Heading Text</FieldLabel>
                                <Input value={section.text || ""} onChange={e => upd("text", e.target.value)}
                                    placeholder="e.g. Overview" className="bg-white" />
                            </div>
                            <div>
                                <FieldLabel hint="'task' adds blue underline border">Style</FieldLabel>
                                <Select value={section.level === "title" ? "title" : section.level === "task" ? "task" : "normal"} onValueChange={v => upd("level", v)}>
                                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Section heading (H2)</SelectItem>
                                        <SelectItem value="title">Page title (H1)</SelectItem>
                                        <SelectItem value="task">Task (bold + blue)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* ── Step ── */}
                    {section.type === "step" && (
                        <div className="pt-3 space-y-4">
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-1">
                                    <FieldLabel>No.</FieldLabel>
                                    <Input type="number" value={section.stepNumber || ""} onChange={e => upd("stepNumber", e.target.value)}
                                        className="bg-white" placeholder="1" />
                                </div>
                                <div className="col-span-6">
                                    <FieldLabel>Step Title</FieldLabel>
                                    <Input value={section.title || ""} onChange={e => upd("title", e.target.value)}
                                        placeholder="e.g. Configure AWS CLI" className="bg-white" />
                                </div>
                                <div className="col-span-5">
                                    <FieldLabel hint="Matches anchor ID in TOC">Anchor ID</FieldLabel>
                                    <Input value={section.anchorId || ""} onChange={e => upd("anchorId", e.target.value)}
                                        placeholder="step-1-configure-cli" className="bg-white font-mono text-xs" />
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Content Blocks</p>
                                {(section.blocks || []).map(b => (
                                    <BlockEditor
                                        key={b.id}
                                        block={b}
                                        onUpdate={updated => updateBlock(b.id, updated)}
                                        onRemove={() => removeBlock(b.id)}
                                    />
                                ))}
                                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
                                    {Object.keys(BLOCK_META).map(t => (
                                        <Button key={t} type="button" variant="outline" size="sm"
                                            className="h-7 text-xs text-muted-foreground border-dashed hover:text-primary hover:border-primary"
                                            onClick={() => addBlock(t)}>
                                            + {BLOCK_META[t]?.label || t}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Content (narrative blocks, no step number) ── */}
                    {section.type === "content" && (
                        <div className="pt-3 space-y-4">
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-7">
                                    <FieldLabel hint="Optional — shown as a subheading above blocks">Section title</FieldLabel>
                                    <Input value={section.title || ""} onChange={e => upd("title", e.target.value)}
                                        placeholder="e.g. Exercise 1 — Create a storage account" className="bg-white" />
                                </div>
                                <div className="col-span-5">
                                    <FieldLabel hint="Matches TOC slug">Anchor ID</FieldLabel>
                                    <Input value={section.anchorId || ""} onChange={e => upd("anchorId", e.target.value)}
                                        placeholder="exercise-1-storage" className="bg-white font-mono text-xs" />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Content Blocks</p>
                                {(section.blocks || []).map(b => (
                                    <BlockEditor
                                        key={b.id}
                                        block={b}
                                        onUpdate={updated => updateBlock(b.id, updated)}
                                        onRemove={() => removeBlock(b.id)}
                                    />
                                ))}
                                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
                                    {Object.keys(BLOCK_META).map(t => (
                                        <Button key={t} type="button" variant="outline" size="sm"
                                            className="h-7 text-xs text-muted-foreground border-dashed hover:text-primary hover:border-primary"
                                            onClick={() => addBlock(t)}>
                                            + {BLOCK_META[t]?.label || t}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Media ── */}
                    {section.type === "media" && (
                        <div className="grid grid-cols-2 gap-3 pt-3">
                            <div>
                                <FieldLabel>Media Type</FieldLabel>
                                <Select value={section.mediaType || "image"} onValueChange={v => upd("mediaType", v)}>
                                    <SelectTrigger className="bg-white mb-2"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {["image", "video", "youtube"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <MediaUploader
                                    accept={section.mediaType === "video" ? "video" : "image"}
                                    value={null}
                                    previewUrl={section.src || ""}
                                    onChange={(f) => {
                                        if (f) {
                                            onUpdate({
                                                ...section,
                                                src: URL.createObjectURL(f),
                                                _pendingFile: f,
                                            });
                                        } else {
                                            onUpdate({ ...section, src: "", _pendingFile: undefined });
                                        }
                                    }}
                                    showPreview
                                />
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <FieldLabel>Caption (optional)</FieldLabel>
                                    <Input value={section.caption || ""} onChange={e => upd("caption", e.target.value)}
                                        placeholder="Image caption" className="bg-white" />
                                </div>
                                <div>
                                    <FieldLabel hint="For SEO and accessibility">Alt Text</FieldLabel>
                                    <Input value={section.alt || ""} onChange={e => upd("alt", e.target.value)}
                                        placeholder="Describe the image" className="bg-white" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Congrats ── */}
                    {section.type === "congrats" && (
                        <div className="pt-3 space-y-3">
                            <div>
                                <FieldLabel>Lab Code (shown in completion banner)</FieldLabel>
                                <Input value={section.labCode || ""} onChange={e => upd("labCode", e.target.value)}
                                    placeholder="LAB-101-01-01" className="bg-white font-mono" />
                            </div>
                            <div>
                                <FieldLabel>Summary Text</FieldLabel>
                                <Textarea value={section.summary || ""} onChange={e => upd("summary", e.target.value)}
                                    placeholder="You have successfully completed all tasks in this lab."
                                    rows={2} className="bg-white" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LabSection;
/**
 * MediaUploader.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-grade reusable drag-and-drop media uploader with rich previews.
 * Supports: "image" | "video" | "audio" | "pdf" | "any"
 *
 * Props:
 *   accept       "image" | "video" | "audio" | "pdf" | "any"
 *   value        File | null
 *   previewUrl   string | null   (existing saved URL from server)
 *   onChange     (file: File | null) => void
 *   maxMB        number          (optional size cap)
 *   label        string
 *   hint         string          (overrides default hint text)
 *   error        string
 *   showPreview  boolean         (default true)
 *   className    string
 *   disabled     boolean
 */

import { useRef, useState, useEffect, useCallback } from "react";
import {
    Upload, X, Film, Music, FileText, ImageIcon, File, Eye,
    CheckCircle2, AlertCircle, Link2, ZoomIn, Replace,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    image: { accept: "image/jpeg,image/png,image/gif,image/svg+xml,image/webp", label: "Image", hint: "PNG, JPG, GIF or SVG", Icon: ImageIcon, color: "sky" },
    video: { accept: "video/mp4,video/webm,video/ogg,video/*", label: "Video", hint: "MP4, WebM or Ogg", Icon: Film, color: "violet" },
    audio: { accept: "audio/mp3,audio/wav,audio/ogg,audio/aac,audio/*", label: "Audio", hint: "MP3, WAV, OGG or AAC", Icon: Music, color: "emerald" },
    pdf: { accept: "application/pdf", label: "PDF", hint: "PDF documents only", Icon: FileText, color: "rose" },
    any: { accept: "*/*", label: "File", hint: "Any file type", Icon: File, color: "slate" },
};

const COLOR = {
    sky: { icon: "text-sky-500", iconBg: "bg-sky-500/12", border: "border-sky-400/50", activeBg: "bg-sky-50 dark:bg-sky-950/20" },
    violet: { icon: "text-violet-500", iconBg: "bg-violet-500/12", border: "border-violet-400/50", activeBg: "bg-violet-50 dark:bg-violet-950/20" },
    emerald: { icon: "text-emerald-500", iconBg: "bg-emerald-500/12", border: "border-emerald-400/50", activeBg: "bg-emerald-50 dark:bg-emerald-950/20" },
    rose: { icon: "text-rose-500", iconBg: "bg-rose-500/12", border: "border-rose-400/50", activeBg: "bg-rose-50 dark:bg-rose-950/20" },
    slate: { icon: "text-slate-500", iconBg: "bg-slate-500/12", border: "border-slate-400/50", activeBg: "bg-slate-50 dark:bg-slate-950/20" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(b) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
}

function useObjectUrl(file) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!(file )) { setUrl(null); return; }
        const u = URL.createObjectURL(file);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [file]);
    return url;
}

// ─── Preview Components ───────────────────────────────────────────────────────

function ImagePreview({ file, previewUrl }) {
    const objectUrl = useObjectUrl(file);
    const src = objectUrl || previewUrl;
    const [lightbox, setLightbox] = useState(false);
    if (!src) return null;
    return (
        <>
            <div
                className="relative mt-2.5 rounded-xl overflow-hidden border bg-muted/30 group cursor-zoom-in"
                onClick={() => setLightbox(true)}
            >
                <img src={src} alt="Preview" className="w-full max-h-56 object-contain" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white/90 dark:bg-black/80 text-foreground rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur">
                        <ZoomIn className="w-3.5 h-3.5" /> Full Size
                    </span>
                </div>
            </div>
            {lightbox && (
                <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setLightbox(false)}>
                    <button type="button" onClick={() => setLightbox(false)} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <img src={src} alt="Full size" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
                </div>
            )}
        </>
    );
}

function VideoPreview({ file, previewUrl }) {
    const objectUrl = useObjectUrl(file);
    const src = objectUrl || previewUrl;
    if (!src) return null;
    return (
        <div className="mt-2.5 rounded-xl overflow-hidden border bg-black shadow-sm">
            <video key={src} src={src} controls className="w-full max-h-64" preload="metadata" />
        </div>
    );
}

function AudioPreview({ file, previewUrl }) {
    const objectUrl = useObjectUrl(file);
    const src = objectUrl || previewUrl;
    if (!src) return null;
    return (
        <div className="mt-2.5 rounded-xl border bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{file?.name || "Audio file"}</p>
                    {file && <p className="text-xs text-muted-foreground">{fmtBytes(file.size)}</p>}
                </div>
            </div>
            <audio key={src} src={src} controls className="w-full h-9" />
        </div>
    );
}

function PdfPreview({ file, previewUrl }) {
    const objectUrl = useObjectUrl(file);
    const src = objectUrl || previewUrl;
    const [open, setOpen] = useState(false);
    if (!src) return null;
    return (
        <div className="mt-2.5 rounded-xl border overflow-hidden shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-rose-50/80 dark:bg-rose-950/20 border-b">
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 truncate">{file?.name || "Document.pdf"}</p>
                    {file && <p className="text-[10px] text-muted-foreground mt-0.5">{fmtBytes(file.size)}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => setOpen(o => !o)} className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors">
                        <Eye className="w-3.5 h-3.5" />{open ? "Collapse" : "Preview"}
                    </button>
                    <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors ml-1">
                        <Link2 className="w-3.5 h-3.5" />Open
                    </a>
                </div>
            </div>
            {open && (
                <iframe src={`${src}#toolbar=1&view=FitH`} className="w-full border-0" style={{ height: 500 }} title="PDF" />
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MediaUploader({
    accept = "image",
    value = null,
    previewUrl = null,
    onChange,
    maxMB,
    label,
    hint,
    error,
    showPreview = true,
    className,
    disabled = false,
}) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [sizeErr, setSizeErr] = useState("");

    const cfg = TYPE_CONFIG[accept] || TYPE_CONFIG.any;
    const colors = COLOR[cfg.color] || COLOR.slate;

    const process = useCallback((file) => {
        if (!file) return;
        if (maxMB && file.size > maxMB * 1024 * 1024) {
            setSizeErr(`File is too large (${fmtBytes(file.size)}). Max ${maxMB} MB.`);
            return;
        }
        setSizeErr("");
        onChange?.(file);
    }, [maxMB, onChange]);

    const onInput = (e) => process(e.target.files?.[0]);
    const onDrop = (e) => { e.preventDefault(); setDragging(false); process(e.dataTransfer.files?.[0]); };
    const onDragOver = (e) => { e.preventDefault(); !disabled && setDragging(true); };
    const onDragLeave = () => setDragging(false);
    const clearFile = (e) => { e.stopPropagation(); setSizeErr(""); onChange?.(null); if (inputRef.current) inputRef.current.value = ""; };

    const hasFile = value  ;
    const hasContent = hasFile || !!previewUrl;
    const anyError = error || sizeErr;

    return (
        <div className={cn("space-y-2", className)}>
            {label && <p className="text-sm font-semibold text-foreground">{label}</p>}

            <input ref={inputRef} type="file" accept={cfg.accept} onChange={onInput} disabled={disabled} className="hidden" />

            {/* ── Drop zone (always visible, adapts when file selected) ── */}
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
                className={cn(
                    "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    dragging && [colors.border, "scale-[1.01] shadow-lg", colors.activeBg],
                    !dragging && hasFile && [colors.border, colors.activeBg],
                    !dragging && !hasFile && !anyError && "border-muted-foreground/20 bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
                    !dragging && !hasFile && anyError && "border-destructive/40 bg-destructive/5 hover:border-destructive/60",
                    disabled && "opacity-50 pointer-events-none",
                )}
            >
                {/* Clear button */}
                {hasFile && !disabled && (
                    <button
                        type="button"
                        onClick={clearFile}
                        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-lg bg-background/80 hover:bg-destructive hover:text-destructive-foreground border shadow-sm flex items-center justify-center transition-all"
                        title="Remove"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}

                <div className="flex flex-col items-center justify-center gap-3 py-8 px-6 text-center">
                    {/* Icon */}
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                        dragging ? [colors.iconBg, "scale-110"] : hasFile ? colors.iconBg : "bg-muted/50",
                    )}>
                        {dragging
                            ? <Upload className={cn("w-6 h-6 animate-bounce", colors.icon)} />
                            : hasFile
                                ? <CheckCircle2 className={cn("w-6 h-6", colors.icon)} />
                                : <cfg.Icon className={cn("w-6 h-6", anyError ? "text-destructive/60" : "text-muted-foreground/60")} />
                        }
                    </div>

                    {/* Text */}
                    {hasFile ? (
                        <div>
                            <p className={cn("text-sm font-semibold", colors.icon)}>{value.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{fmtBytes(value.size)}</p>
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
                                <Replace className="w-3 h-3" /> Click to replace
                            </p>
                        </div>
                    ) : previewUrl ? (
                        <div>
                            <p className={cn("text-sm font-semibold", colors.icon)}>File already uploaded</p>
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">{previewUrl}</p>
                            <p className="text-xs text-primary font-medium mt-1.5">Click to replace</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm font-semibold text-foreground">{dragging ? "Drop it here!" : "Click to upload or drag & drop"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{hint || cfg.hint}{maxMB ? ` · max ${maxMB} MB` : ""}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Error */}
            {anyError && (
                <p className="flex items-start gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {anyError}
                </p>
            )}

            {/* Previews */}
            {showPreview && hasContent && (
                <>
                    {accept === "image" && <ImagePreview file={value} previewUrl={previewUrl} />}
                    {accept === "video" && <VideoPreview file={value} previewUrl={previewUrl} />}
                    {accept === "audio" && <AudioPreview file={value} previewUrl={previewUrl} />}
                    {accept === "pdf" && <PdfPreview file={value} previewUrl={previewUrl} />}
                </>
            )}
        </div>
    );
}

export default MediaUploader;
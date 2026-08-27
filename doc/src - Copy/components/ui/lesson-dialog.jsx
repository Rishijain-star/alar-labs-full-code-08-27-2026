/**
 * LessonDialog.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully reusable lesson add/edit dialog.
 * Supports types: video | article | quiz | code | audio | pdf
 *
 * Props:
 *   open         boolean
 *   onOpenChange (open: boolean) => void
 *   lesson       LessonObject | null
 *   isNew        boolean
 *   onSave       (lesson: LessonObject) => void
 */

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle, Film, FileText, HelpCircle, Code, Music,
  Link, Upload, Clock, BookOpen, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MediaUploader from "./media-uploader";

// ─── Lesson type definitions ──────────────────────────────────────────────────

export const LESSON_TYPES = [
  { value: "video",   label: "Video",    Icon: Film,       color: "text-violet-500",  bg: "bg-violet-500/10",  desc: "MP4, YouTube, Vimeo" },
  { value: "article", label: "Article",  Icon: BookOpen,   color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Rich text content"    },
  { value: "quiz",    label: "Quiz",     Icon: HelpCircle, color: "text-purple-500",  bg: "bg-purple-500/10",  desc: "Questions & answers"  },
  { value: "code",    label: "Code",     Icon: Code,       color: "text-orange-500",  bg: "bg-orange-500/10",  desc: "Code snippets & labs" },
  { value: "audio",   label: "Audio",    Icon: Music,      color: "text-sky-500",     bg: "bg-sky-500/10",     desc: "Podcast, lecture"     },
  { value: "pdf",     label: "PDF",      Icon: FileText,   color: "text-rose-500",    bg: "bg-rose-500/10",    desc: "Documents, slides"    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, required, hint }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <Label className="text-sm font-semibold text-foreground">
        {children}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive font-medium mt-1.5">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
    </p>
  );
}

// ─── Type Picker ──────────────────────────────────────────────────────────────

function TypePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LESSON_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-all text-center",
            value === t.value
              ? `${t.bg} border-current/30 shadow-sm`
              : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
          )}
        >
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", t.bg)}>
            <t.Icon className={cn("w-4 h-4", t.color)} />
          </div>
          <span className={cn("text-xs font-semibold leading-none", value === t.value ? t.color : "text-foreground")}>
            {t.label}
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">{t.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Video Source Picker ──────────────────────────────────────────────────────

function VideoSourcePicker({ videoFile, videoUrl, onChange }) {
  const [mode, setMode] = useState(videoFile ? "upload" : "url");

  const switchMode = (m) => {
    setMode(m);
    onChange({ videoFile: null, videoUrl: "" });
  };

  return (
    <div className="space-y-3">
      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { id: "upload", label: "Upload File", Icon: Upload },
          { id: "url",    label: "External URL", Icon: Link  },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchMode(id)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === id
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <MediaUploader
          accept="video"
          value={videoFile}
          maxMB={800}
          hint="MP4, WebM or Ogg · max 800 MB"
          onChange={(file) => onChange({ videoFile: file, videoUrl: "" })}
          showPreview={true}
        />
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 text-sm"
              placeholder="https://youtube.com/watch?v=… or Vimeo / direct MP4"
              value={videoUrl || ""}
              onChange={(e) => onChange({ videoFile: null, videoUrl: e.target.value })}
            />
          </div>

          {/* URL validation */}
          {videoUrl && !/^https?:\/\//.test(videoUrl) && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />Must start with http:// or https://
            </p>
          )}

          {/* Inline preview for direct video URLs */}
          {videoUrl && /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl) && (
            <div className="rounded-xl overflow-hidden border bg-black mt-2">
              <video src={videoUrl} controls className="w-full max-h-52" preload="metadata" />
            </div>
          )}

          {/* Notice for YouTube / Vimeo */}
          {videoUrl && /youtube\.com|youtu\.be|vimeo\.com/i.test(videoUrl) && (
            <div className="flex items-start gap-2.5 p-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl">
              <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-xs text-violet-700 dark:text-violet-300">
                YouTube / Vimeo URLs will be embedded on the course player. Preview is available on the live page.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function LessonDialog({ open, onOpenChange, lesson, isNew, onSave }) {
  const [form, setForm]         = useState(null);
  const [errors, setErrors]     = useState({});
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open && lesson) {
      setForm({ ...lesson });
      setErrors({});
      setAttempted(false);
    }
  }, [open, lesson]);

  if (!form) return null;

  const set     = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const typeObj = LESSON_TYPES.find((t) => t.value === form.type) || LESSON_TYPES[0];

  // ── Validate ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.title?.trim())
      e.title = "Lesson title is required.";
    if (form.type === "video" && !form.videoFile && !form.videoUrl?.trim())
      e.media = "Add a video file or paste a URL.";
    if (form.type === "audio" && !form.audioFile && !form.audioUrl?.trim())
      e.media = "Add an audio file or paste a URL.";
    if (form.type === "pdf" && !form.pdfFile && !form.pdfUrl?.trim())
      e.media = "Add a PDF file or paste a URL.";
    return e;
  };

  const handleSave = () => {
    setAttempted(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave?.(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", typeObj.bg)}>
              <typeObj.Icon className={cn("w-4.5 h-4.5", typeObj.color)} />
            </div>
            <span>{isNew ? "Add New Lesson" : "Edit Lesson"}</span>
            <Badge variant="outline" className={cn("ml-auto text-xs capitalize font-semibold", typeObj.color)}>
              {typeObj.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* Title */}
          <div>
            <FieldLabel required>Lesson Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Introduction to React Hooks"
              autoFocus
              className={cn("text-sm h-10", attempted && errors.title && "border-destructive focus-visible:ring-destructive")}
            />
            <FieldError error={attempted ? errors.title : ""} />
          </div>

          {/* Lesson Type */}
          <div>
            <FieldLabel>Lesson Type</FieldLabel>
            <TypePicker
              value={form.type}
              onChange={(v) => {
                set("type", v);
                // Reset media when changing type
                setForm((f) => ({ ...f, type: v, videoFile: null, videoUrl: "", audioFile: null, audioUrl: "", pdfFile: null, pdfUrl: "", content: f.content || "" }));
              }}
            />
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel hint="e.g. 12:30">Duration</FieldLabel>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 text-sm h-10"
                  placeholder="00:00"
                  value={form.duration || ""}
                  onChange={(e) => set("duration", e.target.value)}
                />
              </div>
            </div>

            {/* Optional: isFree preview toggle would go here */}
          </div>

          {/* ─── Type-specific fields ─────────────────────────────────────────── */}

          {/* VIDEO */}
          {form.type === "video" && (
            <div>
              <FieldLabel required>Video Source</FieldLabel>
              <VideoSourcePicker
                videoFile={form.videoFile}
                videoUrl={form.videoUrl}
                onChange={({ videoFile, videoUrl }) => {
                  set("videoFile", videoFile);
                  set("videoUrl", videoUrl);
                }}
              />
              <FieldError error={attempted ? errors.media : ""} />
            </div>
          )}

          {/* AUDIO */}
          {form.type === "audio" && (
            <div className="space-y-3">
              <FieldLabel required>Audio File</FieldLabel>
              <MediaUploader
                accept="audio"
                value={form.audioFile}
                previewUrl={form.audioUrl}
                maxMB={200}
                onChange={(file) => { set("audioFile", file); if (file) set("audioUrl", ""); }}
                showPreview={true}
              />
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Or paste an audio URL</p>
                <Input
                  className="text-sm h-10"
                  placeholder="https://example.com/lecture.mp3"
                  value={form.audioUrl || ""}
                  onChange={(e) => { set("audioUrl", e.target.value); set("audioFile", null); }}
                />
              </div>
              <FieldError error={attempted ? errors.media : ""} />
            </div>
          )}

          {/* PDF */}
          {form.type === "pdf" && (
            <div className="space-y-3">
              <FieldLabel required>PDF Document</FieldLabel>
              <MediaUploader
                accept="pdf"
                value={form.pdfFile}
                previewUrl={form.pdfUrl}
                maxMB={50}
                onChange={(file) => { set("pdfFile", file); if (file) set("pdfUrl", ""); }}
                showPreview={true}
              />
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Or paste a PDF URL</p>
                <Input
                  className="text-sm h-10"
                  placeholder="https://example.com/slides.pdf"
                  value={form.pdfUrl || ""}
                  onChange={(e) => { set("pdfUrl", e.target.value); set("pdfFile", null); }}
                />
              </div>
              <FieldError error={attempted ? errors.media : ""} />
            </div>
          )}

          {/* ARTICLE */}
          {form.type === "article" && (
            <div>
              <FieldLabel hint="Markdown supported">Article Content</FieldLabel>
              <Textarea
                placeholder="Write your lesson content here. You can use Markdown formatting…"
                value={form.content || ""}
                onChange={(e) => set("content", e.target.value)}
                className="min-h-[180px] text-sm font-mono resize-y"
              />
              {form.content && (
                <p className="text-xs text-muted-foreground mt-1.5">{form.content.length} characters</p>
              )}
            </div>
          )}

          {/* CODE */}
          {form.type === "code" && (
            <div>
              <FieldLabel>Code / Instructions</FieldLabel>
              <Textarea
                placeholder="Paste your code snippet, exercise instructions, or starter code…"
                value={form.content || ""}
                onChange={(e) => set("content", e.target.value)}
                className="min-h-[180px] text-sm font-mono resize-y bg-muted/30"
              />
            </div>
          )}

          {/* QUIZ */}
          {form.type === "quiz" && (
            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Quiz Questions</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 leading-relaxed">
                  Save this lesson first, then use the <strong>Quiz Builder</strong> to add questions, choices, and correct answers.
                </p>
              </div>
            </div>
          )}

          {/* Instructor Notes (all types) */}
          <div>
            <FieldLabel hint="Internal only, not shown to students">Instructor Notes</FieldLabel>
            <Input
              className="text-sm h-10 text-muted-foreground"
              placeholder="Optional internal note about this lesson…"
              value={form.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {/* Validation summary */}
          {attempted && Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive mb-1">Fix the following to continue:</p>
                <ul className="text-xs text-destructive space-y-0.5 list-disc list-inside">
                  {Object.values(errors).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.title?.trim()}
            className="h-9 min-w-[120px]"
          >
            {isNew ? "Add Lesson" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LessonDialog;
import { useMemo, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  FileText, Video, Code2, HelpCircle, Puzzle, Plus,
  Image as ImageIcon, Music, FileIcon, Upload, X, Check,
  Trash2, ChevronDown, ChevronUp, Lock, Unlock, GripVertical,
  Link, Film, Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SortableItemShell } from "./SortableItemShell";

// ─── Utils ────────────────────────────────────────────────────────────────────

function uid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const prettyBytes = (n) => {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

// ─── Block palette definition ─────────────────────────────────────────────────

const PALETTE = [
  { type: "text", label: "Text Block", desc: "Rich text / markdown", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
  { type: "image", label: "Image", desc: "Upload or URL", icon: ImageIcon, color: "text-pink-500", bg: "bg-pink-500/10" },
  { type: "video", label: "Video", desc: "Upload or YouTube/Vimeo", icon: Film, color: "text-purple-500", bg: "bg-purple-500/10" },
  { type: "audio", label: "Audio", desc: "Upload MP3/WAV or URL", icon: Volume2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { type: "pdf", label: "PDF / Document", desc: "Upload a PDF file", icon: FileIcon, color: "text-orange-500", bg: "bg-orange-500/10" },
  { type: "code", label: "Code Challenge", desc: "Starter code + points", icon: Code2, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { type: "quiz", label: "Quiz / MCQ", desc: "Single or multi choice", icon: HelpCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
  { type: "puzzle", label: "Puzzle / Task", desc: "Instructions & tasks", icon: Puzzle, color: "text-violet-500", bg: "bg-violet-500/10" },
];

const PALETTE_MAP = Object.fromEntries(PALETTE.map(p => [p.type, p]));

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createBlock(type) {
  const meta = PALETTE_MAP[type] || PALETTE_MAP.text;
  const base = { id: uid(type), type, title: `New ${meta.label}`, access: "free", collapsed: false };
  switch (type) {
    case "text": return { ...base, body: "" };
    case "image": return { ...base, source: "upload", url: "", file: null, fileName: "", fileSize: 0, alt: "", caption: "" };
    case "video": return { ...base, source: "upload", url: "", file: null, fileName: "", fileSize: 0 };
    case "audio": return { ...base, source: "upload", url: "", file: null, fileName: "", fileSize: 0 };
    case "pdf": return { ...base, file: null, fileName: "", fileSize: 0, description: "" };
    case "code": return { ...base, language: "python", starterCode: "# Write your solution here\n", points: 10, instructions: "" };
    case "quiz": return {
      ...base,
      question: "",
      questionType: "single",
      options: [
        { id: uid("opt"), text: "Option A", correct: true },
        { id: uid("opt"), text: "Option B", correct: false },
      ],
      explanation: "",
      points: 1,
    };
    case "puzzle": return { ...base, instructions: "", tasks: [{ id: uid("task"), text: "" }] };
    default: return { ...base, body: "" };
  }
}

// ─── Shared: File Upload Zone ─────────────────────────────────────────────────

function FileUploadZone({ accept, icon: Icon, label, hint, file, fileName, fileSize, onFile, onClear, hasError }) {
  const ref = useRef(null);
  return (
    <div>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      {file || fileName ? (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-primary/5"
        )}>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            {fileSize > 0 && <p className="text-xs text-muted-foreground">{prettyBytes(fileSize)}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => ref.current?.click()}>
              <Upload className="w-3.5 h-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onClear}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
          className={cn(
            "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all",
            hasError
              ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
              : "border-muted hover:border-primary/40 hover:bg-muted/20"
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center",
            hasError ? "bg-destructive/10" : "bg-muted"
          )}>
            <Icon className={cn("w-4 h-4", hasError ? "text-destructive" : "text-muted-foreground")} />
          </div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
      )}
    </div>
  );
}

// ─── Source Toggle (Upload / URL) ─────────────────────────────────────────────

function SourceToggle({ value, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-4">
      {["upload", "url"].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={cn(
            "py-1 rounded-md text-xs font-medium capitalize transition-all",
            value === s ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          )}>
          {s === "upload" ? "Upload File" : "External URL"}
        </button>
      ))}
    </div>
  );
}

// ─── Block Editors ────────────────────────────────────────────────────────────

function TextEditor({ block, patch }) {
  return (
    <Textarea
      value={block.body}
      onChange={e => patch(b => ({ ...b, body: e.target.value }))}
      placeholder="Write your content here... (supports markdown)"
      className="min-h-[140px] font-sans text-sm"
    />
  );
}

function ImageEditor({ block, patch }) {
  const handleFile = (f) => {
    if (f.size > 5 * 1024 * 1024) { alert("Image must be under 5 MB"); return; }
    patch(b => ({ ...b, file: f, fileName: f.name, fileSize: f.size }));
  };
  const clearFile = () => patch(b => ({ ...b, file: null, fileName: "", fileSize: 0 }));

  return (
    <div className="space-y-4">
      <SourceToggle value={block.source} onChange={v => patch(b => ({ ...b, source: v, file: null, fileName: "", fileSize: 0, url: "" }))} />

      {block.source === "upload" ? (
        <FileUploadZone
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          icon={ImageIcon}
          label="Click to upload or drag & drop"
          hint="PNG, JPG, GIF, WebP · max 5 MB"
          file={block.file}
          fileName={block.fileName}
          fileSize={block.fileSize}
          onFile={handleFile}
          onClear={clearFile}
        />
      ) : (
        <div className="space-y-2">
          <Input
            value={block.url}
            onChange={e => patch(b => ({ ...b, url: e.target.value }))}
            placeholder="https://example.com/image.jpg"
          />
          {block.url && /^https?:\/\//.test(block.url) && (
            <div className="rounded-lg overflow-hidden border bg-muted/20 max-h-48 flex items-center justify-center">
              <img src={block.url} alt="preview" className="max-h-48 object-contain" onError={e => e.currentTarget.style.display = 'none'} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alt Text</label>
          <Input value={block.alt || ""} onChange={e => patch(b => ({ ...b, alt: e.target.value }))} placeholder="Describe the image" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caption</label>
          <Input value={block.caption || ""} onChange={e => patch(b => ({ ...b, caption: e.target.value }))} placeholder="Optional caption" />
        </div>
      </div>
    </div>
  );
}

function VideoEditor({ block, patch }) {
  const handleFile = (f) => {
    if (f.size > 800 * 1024 * 1024) { alert("Video must be under 800 MB"); return; }
    patch(b => ({ ...b, file: f, fileName: f.name, fileSize: f.size }));
  };
  const clearFile = () => patch(b => ({ ...b, file: null, fileName: "", fileSize: 0 }));

  const isYouTube = /youtube\.com|youtu\.be/.test(block.url || "");
  const isVimeo = /vimeo\.com/.test(block.url || "");

  const getEmbedUrl = (url) => {
    try {
      if (/youtu\.be\//.test(url)) {
        const id = url.split("youtu.be/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      if (/youtube\.com\/watch/.test(url)) {
        const id = new URL(url).searchParams.get("v");
        return `https://www.youtube.com/embed/${id}`;
      }
      if (/vimeo\.com\/(\d+)/.test(url)) {
        const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
        return `https://player.vimeo.com/video/${id}`;
      }
    } catch { /* ignore */ }
    return null;
  };

  return (
    <div className="space-y-4">
      <SourceToggle value={block.source} onChange={v => patch(b => ({ ...b, source: v, file: null, fileName: "", fileSize: 0, url: "" }))} />

      {block.source === "upload" ? (
        <FileUploadZone
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          icon={Film}
          label="Click to upload or drag & drop"
          hint="MP4, WebM, MOV · max 800 MB"
          file={block.file}
          fileName={block.fileName}
          fileSize={block.fileSize}
          onFile={handleFile}
          onClear={clearFile}
        />
      ) : (
        <div className="space-y-3">
          <Input
            value={block.url}
            onChange={e => patch(b => ({ ...b, url: e.target.value }))}
            placeholder="https://www.youtube.com/watch?v=... or Vimeo URL"
          />
          {block.url && (isYouTube || isVimeo) && getEmbedUrl(block.url) && (
            <div className="aspect-video rounded-xl overflow-hidden border bg-black">
              <iframe
                src={getEmbedUrl(block.url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video preview"
              />
            </div>
          )}
          {block.url && !isYouTube && !isVimeo && /^https?:\/\//.test(block.url) && (
            <div className="aspect-video rounded-xl overflow-hidden border bg-black">
              <video src={block.url} controls className="w-full h-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AudioEditor({ block, patch }) {
  const handleFile = (f) => {
    if (f.size > 100 * 1024 * 1024) { alert("Audio must be under 100 MB"); return; }
    patch(b => ({ ...b, file: f, fileName: f.name, fileSize: f.size }));
  };
  const clearFile = () => patch(b => ({ ...b, file: null, fileName: "", fileSize: 0 }));

  return (
    <div className="space-y-4">
      <SourceToggle value={block.source} onChange={v => patch(b => ({ ...b, source: v, file: null, fileName: "", fileSize: 0, url: "" }))} />

      {block.source === "upload" ? (
        <FileUploadZone
          accept="audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4"
          icon={Volume2}
          label="Click to upload or drag & drop"
          hint="MP3, WAV, OGG, AAC · max 100 MB"
          file={block.file}
          fileName={block.fileName}
          fileSize={block.fileSize}
          onFile={handleFile}
          onClear={clearFile}
        />
      ) : (
        <Input
          value={block.url}
          onChange={e => patch(b => ({ ...b, url: e.target.value }))}
          placeholder="https://example.com/audio.mp3"
        />
      )}

      {/* Audio preview */}
      {(block.file || (block.url && /^https?:\/\//.test(block.url))) && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium">{block.fileName || "Audio Preview"}</p>
              {block.fileSize > 0 && <p className="text-xs text-muted-foreground">{prettyBytes(block.fileSize)}</p>}
            </div>
          </div>
          {block.url && <audio src={block.url} controls className="w-full h-8" />}
          {block.file && <audio src={URL.createObjectURL(block.file)} controls className="w-full h-8" />}
        </div>
      )}
    </div>
  );
}

function PdfEditor({ block, patch }) {
  const handleFile = (f) => {
    if (f.size > 50 * 1024 * 1024) { alert("PDF must be under 50 MB"); return; }
    patch(b => ({ ...b, file: f, fileName: f.name, fileSize: f.size }));
  };
  const clearFile = () => patch(b => ({ ...b, file: null, fileName: "", fileSize: 0 }));

  return (
    <div className="space-y-4">
      <FileUploadZone
        accept="application/pdf"
        icon={FileIcon}
        label="Click to upload PDF"
        hint="PDF files only · max 50 MB"
        file={block.file}
        fileName={block.fileName}
        fileSize={block.fileSize}
        onFile={handleFile}
        onClear={clearFile}
      />

      {(block.file || block.fileName) && (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-orange-500/5 border-orange-500/20">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <FileIcon className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{block.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {block.fileSize > 0 ? prettyBytes(block.fileSize) : "PDF Document"}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-orange-600 border-orange-300">PDF</Badge>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description (optional)</label>
        <Textarea
          value={block.description || ""}
          onChange={e => patch(b => ({ ...b, description: e.target.value }))}
          placeholder="Brief description of this document..."
          className="min-h-[80px] text-sm"
        />
      </div>
    </div>
  );
}

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash/Shell" },
];

function CodeEditor({ block, patch }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Instructions</label>
        <Textarea
          value={block.instructions || ""}
          onChange={e => patch(b => ({ ...b, instructions: e.target.value }))}
          placeholder="Describe what the student needs to implement..."
          className="min-h-[80px] text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Language</label>
          <Select value={block.language} onValueChange={v => patch(b => ({ ...b, language: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Points</label>
          <Input
            type="number" min={1}
            value={block.points}
            onChange={e => patch(b => ({ ...b, points: Number(e.target.value || 0) }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Starter Code</label>
          <Badge variant="outline" className="text-xs">{block.language}</Badge>
        </div>
        <Textarea
          value={block.starterCode}
          onChange={e => patch(b => ({ ...b, starterCode: e.target.value }))}
          className="min-h-[160px] font-mono text-sm leading-relaxed"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        />
      </div>
    </div>
  );
}

function QuizEditor({ block, patch }) {
  const addOption = () => patch(b => ({
    ...b, options: [...b.options, { id: uid("opt"), text: "New option", correct: false }]
  }));
  const removeOption = (optId) => patch(b => ({ ...b, options: b.options.filter(o => o.id !== optId) }));
  const toggleCorrect = (optId, checked) => patch(b => ({
    ...b,
    options: b.questionType === "single"
      ? b.options.map(o => ({ ...o, correct: o.id === optId ? checked : false }))
      : b.options.map(o => o.id === optId ? { ...o, correct: checked } : o),
  }));
  const updateOptionText = (optId, text) => patch(b => ({
    ...b, options: b.options.map(o => o.id === optId ? { ...o, text } : o)
  }));

  return (
    <div className="space-y-4">
      {/* Question type + points */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question Type</label>
          <Select value={block.questionType} onValueChange={v => patch(b => ({
            ...b,
            questionType: v,
            // reset correct flags when switching to single
            options: v === "single"
              ? b.options.map((o, i) => ({ ...o, correct: i === 0 }))
              : b.options,
          }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single choice</SelectItem>
              <SelectItem value="multi">Multi choice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Points</label>
          <Input
            type="number" min={1}
            value={block.points}
            onChange={e => patch(b => ({ ...b, points: Number(e.target.value || 1) }))}
          />
        </div>
      </div>

      {/* Question */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</label>
        <Textarea
          value={block.question}
          onChange={e => patch(b => ({ ...b, question: e.target.value }))}
          placeholder="Enter your quiz question..."
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Answer Options
          </label>
          <Badge variant="outline" className="text-xs">
            {block.questionType === "single" ? "Select one correct" : "Select all correct"}
          </Badge>
        </div>

        <div className="space-y-2">
          {block.options.map((opt, i) => (
            <div key={opt.id} className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all",
              opt.correct
                ? "border-emerald-400/60 bg-emerald-500/5"
                : "border-border bg-transparent"
            )}>
              {/* Correct toggle */}
              <button
                type="button"
                onClick={() => toggleCorrect(opt.id, !opt.correct)}
                className={cn(
                  "w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition-all",
                  block.questionType === "single" ? "rounded-full" : "rounded",
                  opt.correct
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-muted-foreground/40 hover:border-primary/60"
                )}
              >
                {opt.correct && <Check className="w-3 h-3 text-white" />}
              </button>

              {/* Option letter */}
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {String.fromCharCode(65 + i)}
              </div>

              {/* Text */}
              <Input
                value={opt.text}
                onChange={e => updateOptionText(opt.id, e.target.value)}
                className={cn("flex-1 h-8 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm p-0",
                  opt.correct && "font-medium")}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
              />

              {/* Remove (keep at least 2) */}
              {block.options.length > 2 && (
                <button type="button" onClick={() => removeOption(opt.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addOption}
          className="border-dashed w-full">
          <Plus className="w-4 h-4 mr-1.5" /> Add Option
        </Button>
      </div>

      {/* Explanation */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Explanation (shown after answer)</label>
        <Textarea
          value={block.explanation || ""}
          onChange={e => patch(b => ({ ...b, explanation: e.target.value }))}
          placeholder="Explain why this is the correct answer..."
          className="min-h-[70px] text-sm"
        />
      </div>
    </div>
  );
}

function PuzzleEditor({ block, patch }) {
  const addTask = () => patch(b => ({ ...b, tasks: [...b.tasks, { id: uid("task"), text: "" }] }));
  const removeTask = (id) => patch(b => ({ ...b, tasks: b.tasks.filter(t => t.id !== id) }));
  const updateTask = (id, text) => patch(b => ({ ...b, tasks: b.tasks.map(t => t.id === id ? { ...t, text } : t) }));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Instructions</label>
        <Textarea
          value={block.instructions}
          onChange={e => patch(b => ({ ...b, instructions: e.target.value }))}
          className="min-h-[100px] text-sm"
          placeholder="Describe the puzzle or task the student needs to complete..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task Checklist</label>
        {(block.tasks || []).map((task, i) => (
          <div key={task.id} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 shrink-0" />
            <span className="text-xs text-muted-foreground shrink-0">{i + 1}.</span>
            <Input
              value={task.text}
              onChange={e => updateTask(task.id, e.target.value)}
              placeholder={`Task ${i + 1}`}
              className="flex-1 h-8 text-sm"
            />
            {(block.tasks || []).length > 1 && (
              <button type="button" onClick={() => removeTask(task.id)}
                className="text-muted-foreground hover:text-destructive shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addTask} className="border-dashed w-full">
          <Plus className="w-4 h-4 mr-1.5" /> Add Task
        </Button>
      </div>
    </div>
  );
}

// ─── Block Router ─────────────────────────────────────────────────────────────

function BlockEditor({ block, patch }) {
  switch (block.type) {
    case "text": return <TextEditor block={block} patch={patch} />;
    case "image": return <ImageEditor block={block} patch={patch} />;
    case "video": return <VideoEditor block={block} patch={patch} />;
    case "audio": return <AudioEditor block={block} patch={patch} />;
    case "pdf": return <PdfEditor block={block} patch={patch} />;
    case "code": return <CodeEditor block={block} patch={patch} />;
    case "quiz": return <QuizEditor block={block} patch={patch} />;
    case "puzzle": return <PuzzleEditor block={block} patch={patch} />;
    default: return null;
  }
}

// ─── Sortable Shell ───────────────────────────────────────────────────────────
// Uses your existing SortableItemShell — we just pass the icon+color as subtitle chip

function BlockShell({ block, patch, remove }) {
  const meta = PALETTE_MAP[block.type] || PALETTE_MAP.text;
  const Icon = meta.icon;

  return (
    <SortableItemShell
      id={block.id}
      title={
        <Input
          value={block.title}
          onChange={e => patch(() => ({ title: e.target.value }))}
          className="h-8"
          aria-label="Block title"
        />
      }
      subtitle={
        <div className="flex items-center gap-1.5">
          <div className={cn("w-5 h-5 rounded flex items-center justify-center", meta.bg)}>
            <Icon className={cn("w-3 h-3", meta.color)} />
          </div>
          <span className="text-xs text-muted-foreground capitalize">{meta.label}</span>
        </div>
      }
      access={block.access}
      collapsed={block.collapsed}
      onToggleCollapsed={() => patch(b => ({ ...b, collapsed: !b.collapsed }))}
      onToggleAccess={() => patch(b => ({ ...b, access: b.access === "free" ? "premium" : "free" }))}
      onDelete={() => remove(block.id)}
    >
      <BlockEditor block={block} patch={(patcher) => patch(patcher)} />
    </SortableItemShell>
  );
}

// ─── Main ContentBuilder ──────────────────────────────────────────────────────

export default function ContentBuilder({ value, onChange, title = "Content Builder", className }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = useMemo(() => value.map(b => b.id), [value]);

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = value.findIndex(b => b.id === active.id);
    const newIdx = value.findIndex(b => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(value, oldIdx, newIdx));
  };

  const add = (type) => onChange([...value, createBlock(type)]);
  const patch = (id, patcher) => onChange(value.map(b => b.id === id ? patcher(b) : b));
  const remove = (id) => onChange(value.filter(b => b.id !== id));

  // block-scoped patch factory — keeps b.id + type stable
  const blockPatch = (id) => (patcher) => patch(id, b => ({ ...b, ...patcher(b) }));

  return (
    <div
      className={cn("grid grid-cols-3 gap-6", className)}
      onDragOver={e => { if (e?.dataTransfer?.types?.includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = "none"; } }}
      onDrop={e => { if (e?.dataTransfer?.types?.includes("Files")) { e.preventDefault(); e.stopPropagation(); } }}
    >
      {/* ── Content area ── */}
      <div className="col-span-2 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">Drag to reorder. Lock to mark premium-only.</p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {value.map(block => (
                <BlockShell
                  key={block.id}
                  block={block}
                  patch={blockPatch(block.id)}
                  remove={remove}
                />
              ))}

              {value.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No content blocks yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Pick a block type from the right panel to get started</p>
                  </CardContent>
                </Card>
              )}

              {value.length > 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-5 text-center">
                    <p className="text-sm text-muted-foreground">Add another block from the right panel</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* ── Palette sidebar ── */}
      <div>
        <Card className="border shadow-sm sticky top-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-primary mb-4">Add Block</h3>
            <div className="space-y-1.5">
              {PALETTE.map(p => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => add(p.type)}
                  className="w-full flex items-center gap-3 p-2.5 border rounded-xl hover:bg-muted/30 hover:border-primary/30 transition-all text-left group"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-105", p.bg)}>
                    <p.icon className={cn("w-4 h-4", p.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Block count */}
            {value.length > 0 && (
              <div className="mt-4 p-2.5 bg-primary/5 rounded-lg border border-primary/15 text-center">
                <p className="text-xs font-semibold text-primary">{value.length} block{value.length !== 1 ? "s" : ""} added</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {value.filter(b => b.access === "premium").length} premium · {value.filter(b => b.access === "free").length} free
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
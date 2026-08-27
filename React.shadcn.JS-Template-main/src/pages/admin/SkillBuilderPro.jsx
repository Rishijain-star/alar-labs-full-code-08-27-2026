import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import { useDispatch } from "react-redux";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  Save,
  Eye,
  Play,
  Image as ImageIcon,
  FileText,
  Code2,
  CheckCircle2,
  HelpCircle,
  Layers,
  BookOpen,
  Trash2,
  GripVertical,
  Layout,
  Zap,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  Monitor,
  Copy,
  Pencil,
  Folder,
  Lightbulb,
  Lock,
  Award,
  AlertCircle
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LabOverviewPreviewPanel, LabDetailProgressPreviewPanel } from "@/components/admin/LabPublishPreviewPanels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import AdminContentDates from "@/components/admin/AdminContentDates";
import { pickContentTimestamps } from "@/utils/formatters";
import axiosInstance from "@/lib/axios";
import { showSuccess, showError, showUploadOutcomeError } from "@/lib/toast-utils";
import {
  clearEditorDraft,
  getEditorDraftKey,
  stripEditorFileFields,
  useEditorDraftPersistence,
} from "@/lib/editorDraftPersistence";
import { setLastCreated } from "@/store/slices/labSlice";
import { createFullWithModules, updateFullWithModules } from "@/lib/uploadWithProgress";
import { mapApiLabToModuleEditor } from "@/lib/mapApiLabToModuleEditor";
import OverviewMediaUploadSection from "@/components/admin/OverviewMediaUploadSection";
import RichTextBlockEditor from "@/components/editor/RichTextBlockEditor";
import QuillRichEditor from "@/components/editor/QuillRichEditor";
import AlertBlockEditor from "@/components/editor/AlertBlockEditor";
import PlatformSelect from "@/components/admin/PlatformSelect";
import { confirmDelete } from "@/lib/confirmAction";
import LabCertificateConfigFields from "@/components/admin/LabCertificateConfigFields";
import ValidationErrorBanner from "@/components/admin/ValidationErrorBanner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

// ===========================================
// CONSTANTS
// ===========================================
const STEPS = [
  { id: 1, label: "Lab Info", icon: FileText, description: "Basic lab details" },
  { id: 2, label: "Lessons", icon: BookOpen, description: "Modules, lessons & content" },
  { id: 3, label: "Preview & Publish", icon: Eye, description: "Review and publish your lab" }
];

const PLATFORMS = ["AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Linux", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const CODE_LANGS = ["bash", "python", "javascript", "typescript", "yaml", "json", "sql", "dockerfile", "go"];

const BLOCK_TYPES = [
  {
    id: "video",
    label: "Video Block",
    icon: Play,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "Add instructional videos"
  },
  {
    id: "richText",
    label: "Rich Text Block",
    icon: FileText,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    description: "Add formatted text content"
  },
  {
    id: "image",
    label: "Image Block",
    icon: ImageIcon,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    description: "Add images and diagrams"
  },
  {
    id: "quiz",
    label: "Quiz Block",
    icon: HelpCircle,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    description: "Add multiple-choice questions"
  },
  {
    id: "trueFalse",
    label: "True/False Block",
    icon: CheckCircle2,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    description: "Add true/false questions"
  },
  {
    id: "code",
    label: "Coding Block",
    icon: Code2,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    description: "Add coding examples"
  },
  {
    id: "codeSnippet",
    label: "Code Snippet",
    icon: Code2,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    description: "Add read-only code examples"
  },
  {
    id: "fillBlank",
    label: "Fill in the Blank",
    icon: FileText,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    description: "Add fill-in questions"
  },
  {
    id: "project",
    label: "Project Block",
    icon: Zap,
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    description: "Add project assignments"
  },
  {
    id: "download",
    label: "Download Block",
    icon: Download,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    description: "Add downloadable resources"
  },
  {
    id: "alert",
    label: "Alert Block",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    description: "Add info, note, or warning alerts"
  }
];

// ===========================================
// HELPERS
// ===========================================
let uidCounter = 0;
const uid = () => `id_${++uidCounter}_${Date.now()}`;

const createEmptyBlock = (type) => {
  const base = { id: uid(), type };
  switch (type) {
    case "video":
      return { ...base, title: "", videos: [{ id: uid(), url: "", title: "" }], description: "", notes: "", resources: [] };
    case "richText":
      return { ...base, title: "", content: "" };
    case "image":
      return {
        ...base,
        title: "",
        images: [{ id: uid(), url: "", title: "", altText: "" }],
        caption: "",
        description: "",
        layout: "fullWidth",
        annotations: []
      };
    case "quiz":
      return { ...base, question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", points: 10 };
    case "trueFalse":
      return { ...base, statement: "", correctAnswer: true, explanation: "" };
    case "code":
      return {
        ...base,
        title: "",
        shortDescription: "",
        difficulty: "beginner",
        xp: 10,
        instructions: "",
        files: [
          { id: uid(), name: "index.html", code: "", defaultOpen: true },
          { id: uid(), name: "style.css", code: "", defaultOpen: false },
          { id: uid(), name: "script.js", code: "", defaultOpen: false }
        ],
        previewType: "html",
        validationRules: [],
        expectedOutput: "",
        expectedScreenshot: "",
        hints: [],
        solution: { code: "", videoUrl: "", explanation: "" }
      };
    case "codeSnippet":
      return {
        ...base,
        title: "",
        shortDescription: "",
        language: "javascript",
        code: "",
        explanation: "",
        showLineNumbers: true,
        showCopyButton: true
      };
    case "fillBlank":
      return { ...base, sentence: "", answer: "", hint: "", explanation: "" };
    case "project":
      return { ...base, title: "", requirements: "", submissionInstructions: "", resources: [] };
    case "download":
      return {
        ...base,
        title: "",
        shortDescription: "",
        category: "starterFiles",
        resources: [
          { id: uid(), name: "", type: "file", url: "", file: null }
        ],
        access: { free: true, premium: false, enabled: true, public: true }
      };
    case "alert":
      return { ...base, title: "", message: "", alertType: "info", accentColor: "" };
    default:
      return base;
  }
};

const createEmptyLesson = () => ({
  id: uid(),
  title: "New Lesson",
  blocks: []
});

const createEmptyModule = () => ({
  id: uid(),
  title: "New Module",
  expanded: true,
  lessons: [createEmptyLesson()]
});

// ===========================================
// SORTABLE COMPONENT
// ===========================================
function SortableItem({ id, children, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto"
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// ===========================================
// BLOCK EDITORS
// ===========================================
function VideoBlockEditor({ block, onChange }) {
  const update = (updates) => onChange({ ...block, ...updates });
  const updateVideo = (videoId, updates) => {
    const newVideos = (block.videos || []).map(v => v.id === videoId ? { ...v, ...updates } : v);
    update({ videos: newVideos });
  };
  const addVideo = () => update({ videos: [...(block.videos || []), { id: uid(), url: "", title: "", localFile: null }] });
  const removeVideo = (videoId) => update({ videos: (block.videos || []).filter(v => v.id !== videoId) });

  const handleFileChange = (videoId, e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateVideo(videoId, { localFile: file, url });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-blue-100">
        <Play className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-blue-900">Video Block</h3>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Block Title</label>
        <Input value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Introduction to the topic" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-slate-700">Videos</label>
          <Button variant="secondary" size="sm" onClick={addVideo}><Plus className="w-4 h-4 mr-1" />Add Video</Button>
        </div>
        {(block.videos || []).map((video, idx) => (
          <Card key={video.id} className="mb-3">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <Input value={video.title} onChange={e => updateVideo(video.id, { title: e.target.value })} placeholder={`Video ${idx + 1} Title`} />
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Upload Video (MP4)</label>
                    <Input type="file" accept="video/mp4" onChange={(e) => handleFileChange(video.id, e)} />
                    {video.url && (
                      <div className="mt-2">
                        <video src={video.url} controls className="w-full rounded-lg" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Video URL (optional)</label>
                    <Input value={video.url} onChange={e => updateVideo(video.id, { url: e.target.value })} placeholder="https://example.com/video.mp4" />
                  </div>
                </div>
                {(block.videos || []).length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeVideo(video.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
        <Textarea value={block.description} onChange={e => update({ description: e.target.value })} placeholder="What students will learn in this video..." rows={3} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
        <Textarea value={block.notes} onChange={e => update({ notes: e.target.value })} placeholder="Additional notes for students..." />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Resources</label>
        <Textarea value={block.resources?.join("\n")} onChange={e => update({ resources: e.target.value.split("\n") })} placeholder="Enter one resource per line" />
      </div>
    </div>
  );
}


function QuizBlockEditor({ block, onChange }) {
  const update = (updates) => onChange({ ...block, ...updates });
  const updateOption = (idx, value) => {
    const opts = [...(block.options || ["", "", "", ""])];
    opts[idx] = value;
    update({ options: opts });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-yellow-200">
        <HelpCircle className="w-5 h-5 text-yellow-600" />
        <h3 className="font-bold text-yellow-900">Quiz Block</h3>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Question</label>
        <Textarea value={block.question} onChange={e => update({ question: e.target.value })} placeholder="What is React?" rows={2} />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700 mb-1">Options</label>
        {(block.options || ["", "", "", ""]).map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2",
              block.correctAnswer === i ? "bg-green-500 border-green-500 text-white" : "bg-white border-slate-300 text-slate-600"
            )}>
              {String.fromCharCode(65 + i)}
            </div>
            <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="flex-1" />
            <Button variant="ghost" size="icon" className={block.correctAnswer === i ? "text-green-600" : "text-slate-400"} onClick={() => update({ correctAnswer: i })}>
              <CheckCircle2 className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Explanation</label>
          <Textarea value={block.explanation} onChange={e => update({ explanation: e.target.value })} placeholder="Why is this answer correct..." rows={3} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Points</label>
          <Input type="number" value={block.points} onChange={e => update({ points: Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}

function CodeBlockEditor({ block, onChange }) {
  const update = (updates) => onChange({ ...block, ...updates });
  const updateFile = (fileId, updates) => {
    const newFiles = (block.files || []).map(f => f.id === fileId ? { ...f, ...updates } : f);
    update({ files: newFiles });
  };
  const addFile = () => update({ files: [...(block.files || []), { id: uid(), name: "new-file.html", code: "", defaultOpen: false }] });
  const removeFile = (fileId) => update({ files: (block.files || []).filter(f => f.id !== fileId) });
  const addValidationRule = () => update({ validationRules: [...(block.validationRules || []), { id: uid(), type: "elementExists", selector: "", condition: "" }] });
  const removeValidationRule = (ruleId) => update({ validationRules: (block.validationRules || []).filter(r => r.id !== ruleId) });
  const updateValidationRule = (ruleId, updates) => {
    const newRules = (block.validationRules || []).map(r => r.id === ruleId ? { ...r, ...updates } : r);
    update({ validationRules: newRules });
  };
  const addHint = () => update({ hints: [...(block.hints || []), { id: uid(), text: "" }] });
  const removeHint = (hintId) => update({ hints: (block.hints || []).filter(h => h.id !== hintId) });
  const updateHint = (hintId, updates) => {
    const newHints = (block.hints || []).map(h => h.id === hintId ? { ...h, ...updates } : h);
    update({ hints: newHints });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Code2 className="w-5 h-5 text-green-600" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Block Title</label>
            <Input value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Build a Responsive Hero Section" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Short Description</label>
            <Textarea value={block.shortDescription} onChange={e => update({ shortDescription: e.target.value })} placeholder="Brief description of this coding exercise..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
              <Select value={block.difficulty} onValueChange={v => update({ difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">XP / Marks</label>
              <Input type="number" value={block.xp} onChange={e => update({ xp: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={block.instructions}
            onChange={e => update({ instructions: e.target.value })}
            placeholder="Step-by-step instructions for this coding exercise..."
            rows={5}
          />
        </CardContent>
      </Card>

      {/* File Structure */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Folder className="w-5 h-5 text-purple-600" />
              File Structure
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={addFile}>
              <Plus className="w-4 h-4 mr-2" />Add File
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(block.files || []).map((file, idx) => (
            <Card key={file.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Input
                    value={file.name}
                    onChange={e => updateFile(file.id, { name: e.target.value })}
                    className="flex-1 font-mono"
                  />
                  {(block.files || []).length > 1 && (
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeFile(file.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  value={file.code}
                  onChange={e => updateFile(file.id, { code: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                  placeholder="Starter code for this file..."
                />
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Preview Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="w-5 h-5 text-indigo-600" />
            Preview Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={block.previewType} onValueChange={v => update({ previewType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="html">HTML/CSS Preview</SelectItem>
              <SelectItem value="console">JavaScript Console</SelectItem>
              <SelectItem value="react">React Preview</SelectItem>
              <SelectItem value="terminal">Terminal Output</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Validation Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Validation Rules
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={addValidationRule}>
              <Plus className="w-4 h-4 mr-2" />Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(block.validationRules || []).map((rule, idx) => (
            <Card key={rule.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Rule Type</label>
                    <Select value={rule.type} onValueChange={v => updateValidationRule(rule.id, { type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="elementExists">Element Exists</SelectItem>
                        <SelectItem value="classExists">Class Exists</SelectItem>
                        <SelectItem value="textContains">Text Contains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeValidationRule(rule.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Selector</label>
                    <Input
                      value={rule.selector}
                      onChange={e => updateValidationRule(rule.id, { selector: e.target.value })}
                      placeholder=".hero, #button, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Condition</label>
                    <Input
                      value={rule.condition}
                      onChange={e => updateValidationRule(rule.id, { condition: e.target.value })}
                      placeholder="must be visible, contains text, etc."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Expected Output */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-orange-600" />
            Expected Output
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Result Description</label>
            <Textarea
              value={block.expectedOutput}
              onChange={e => update({ expectedOutput: e.target.value })}
              placeholder="Describe what the student should build..."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Screenshot (optional)</label>
            <Input type="file" accept="image/*" />
          </div>
        </CardContent>
      </Card>

      {/* Hints */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Hints
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={addHint}>
              <Plus className="w-4 h-4 mr-2" />Add Hint
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(block.hints || []).map((hint, idx) => (
            <Card key={hint.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Input
                    value={hint.text}
                    onChange={e => updateHint(hint.id, { text: e.target.value })}
                    className="flex-1"
                    placeholder={`Hint ${idx + 1}...`}
                  />
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeHint(hint.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Solution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Solution (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Solution Code</label>
            <Textarea
              value={block.solution?.code}
              onChange={e => update({ solution: { ...block.solution, code: e.target.value } })}
              className="font-mono text-sm"
              rows={6}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Solution Video URL</label>
            <Input
              value={block.solution?.videoUrl}
              onChange={e => update({ solution: { ...block.solution, videoUrl: e.target.value } })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Solution Explanation</label>
            <Textarea
              value={block.solution?.explanation}
              onChange={e => update({ solution: { ...block.solution, explanation: e.target.value } })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CodeSnippetBlockEditor({ block, onChange }) {
  const update = (updates) => onChange({ ...block, ...updates });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-cyan-200">
        <Code2 className="w-5 h-5 text-cyan-600" />
        <h3 className="font-bold text-cyan-900">Code Snippet</h3>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Block Title</label>
        <Input value={block.title} onChange={e => update({ title: e.target.value })} placeholder="JavaScript Array Methods" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Short Description</label>
        <Textarea value={block.shortDescription} onChange={e => update({ shortDescription: e.target.value })} placeholder="Brief explanation of what this code does..." rows={2} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Programming Language</label>
        <Select value={block.language} onValueChange={v => update({ language: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="typescript">TypeScript</SelectItem>
            <SelectItem value="php">PHP</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="java">Java</SelectItem>
            <SelectItem value="cpp">C++</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="css">CSS</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="bash">Bash</SelectItem>
            <SelectItem value="yaml">YAML</SelectItem>
            <SelectItem value="go">Go</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Code</label>
        <Textarea
          value={block.code}
          onChange={e => update({ code: e.target.value })}
          placeholder="Enter your code snippet here..."
          className="font-mono text-sm"
          rows={10}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Explanation / Notes</label>
        <Textarea value={block.explanation} onChange={e => update({ explanation: e.target.value })} placeholder="Explain the code to students..." rows={4} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-md">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-700">Show Line Numbers</p>
            <p className="text-xs text-slate-500">Display line numbers in the code preview</p>
          </div>
          <Switch checked={block.showLineNumbers} onCheckedChange={v => update({ showLineNumbers: v })} />
        </div>
        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-md">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-700">Show Copy Button</p>
            <p className="text-xs text-slate-500">Allow students to copy the code</p>
          </div>
          <Switch checked={block.showCopyButton} onCheckedChange={v => update({ showCopyButton: v })} />
        </div>
      </div>
    </div>
  );
}

const BLOCK_EDITORS = {
  video: VideoBlockEditor,
  richText: RichTextBlockEditor,
  alert: AlertBlockEditor,
  codeSnippet: CodeSnippetBlockEditor,
  image: function ImageBlockEditor({ block, onChange }) {
    const update = (updates) => onChange({ ...block, ...updates });
    const updateImage = (imageId, updates) => {
      const newImages = (block.images || []).map(i => i.id === imageId ? { ...i, ...updates } : i);
      update({ images: newImages });
    };
    const addImage = () => update({ images: [...(block.images || []), { id: uid(), url: "", title: "", altText: "" }] });
    const removeImage = (imageId) => update({ images: (block.images || []).filter(i => i.id !== imageId) });

    const handleFileChange = (imageId, e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        updateImage(imageId, { file, url });
      }
    };

    return (
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Image Block Title</label><Input value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Hero Section Design" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Short Description</label><Textarea value={block.description} onChange={e => update({ description: e.target.value })} placeholder="Brief description of this image block..." rows={2} /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Caption</label><Input value={block.caption} onChange={e => update({ caption: e.target.value })} /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Layout</label>
              <Select value={block.layout} onValueChange={v => update({ layout: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullWidth">Full Width</SelectItem>
                  <SelectItem value="leftAlign">Left Align</SelectItem>
                  <SelectItem value="rightAlign">Right Align</SelectItem>
                  <SelectItem value="centered">Centered</SelectItem>
                  <SelectItem value="grid">Grid Gallery</SelectItem>
                  <SelectItem value="slider">Slider/Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                Images
              </CardTitle>
              <Button variant="secondary" size="sm" onClick={addImage}>
                <Plus className="w-4 h-4 mr-2" />Add Image
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(block.images || []).map((image, idx) => (
              <Card key={image.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1 space-y-3">
                      <Input value={image.title} onChange={e => updateImage(image.id, { title: e.target.value })} placeholder={`Image ${idx + 1} Title`} />
                      <Input value={image.altText} onChange={e => updateImage(image.id, { altText: e.target.value })} placeholder="Alt Text" />
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Upload Image</label>
                        <Input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" onChange={(e) => handleFileChange(image.id, e)} />
                        {image.url && (
                          <div className="mt-2">
                            <img src={image.url} alt={image.altText} className="w-full rounded-lg border" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Image URL (optional)</label>
                        <Input value={image.url} onChange={e => updateImage(image.id, { url: e.target.value })} placeholder="https://example.com/image.jpg" />
                      </div>
                    </div>
                    {(block.images || []).length > 1 && (
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeImage(image.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  },
  quiz: QuizBlockEditor,
  trueFalse: ({ block, onChange }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-purple-200">
        <CheckCircle2 className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold text-purple-900">True/False Block</h3>
      </div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Statement</label><Textarea value={block.statement} onChange={e => onChange({ ...block, statement: e.target.value })} rows={2} /></div>
      <div className="flex gap-4">
        <Button variant={block.correctAnswer === true ? "default" : "secondary"} onClick={() => onChange({ ...block, correctAnswer: true })} className="flex-1">True</Button>
        <Button variant={block.correctAnswer === false ? "default" : "secondary"} onClick={() => onChange({ ...block, correctAnswer: false })} className="flex-1">False</Button>
      </div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Explanation</label><Textarea value={block.explanation} onChange={e => onChange({ ...block, explanation: e.target.value })} /></div>
    </div>
  ),
  code: CodeBlockEditor,
  fillBlank: ({ block, onChange }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-orange-200">
        <FileText className="w-5 h-5 text-orange-600" />
        <h3 className="font-bold text-orange-900">Fill in the Blank</h3>
      </div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Sentence</label><Input value={block.sentence} onChange={e => onChange({ ...block, sentence: e.target.value })} placeholder="React is a ___ library" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Answer</label><Input value={block.answer} onChange={e => onChange({ ...block, answer: e.target.value })} /></div>
        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Hint</label><Input value={block.hint} onChange={e => onChange({ ...block, hint: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Explanation</label><Textarea value={block.explanation} onChange={e => onChange({ ...block, explanation: e.target.value })} /></div>
    </div>
  ),
  project: ({ block, onChange }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-pink-200">
        <Zap className="w-5 h-5 text-pink-600" />
        <h3 className="font-bold text-pink-900">Project Block</h3>
      </div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Project Title</label><Input value={block.title} onChange={e => onChange({ ...block, title: e.target.value })} /></div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Requirements</label><Textarea value={block.requirements} onChange={e => onChange({ ...block, requirements: e.target.value })} rows={4} /></div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Submission Instructions</label><Textarea value={block.submissionInstructions} onChange={e => onChange({ ...block, submissionInstructions: e.target.value })} /></div>
    </div>
  ),
  download: function DownloadBlockEditor({ block, onChange }) {
    const update = (updates) => onChange({ ...block, ...updates });
    const updateResource = (resourceId, updates) => {
      const newResources = (block.resources || []).map(r => r.id === resourceId ? { ...r, ...updates } : r);
      update({ resources: newResources });
    };
    const addResource = () => update({ resources: [...(block.resources || []), { id: uid(), name: "", type: "file", url: "", file: null }] });
    const removeResource = (resourceId) => update({ resources: (block.resources || []).filter(r => r.id !== resourceId) });

    const handleFileChange = (resourceId, e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        updateResource(resourceId, { file, url, name: file.name });
      }
    };

    return (
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-600" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Resource Title</label><Input value={block.title} onChange={e => update({ title: e.target.value })} placeholder="Starter Project Files" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Short Description</label><Textarea value={block.shortDescription} onChange={e => update({ shortDescription: e.target.value })} placeholder="Brief description of these resources..." rows={2} /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
              <Select value={block.category} onValueChange={v => update({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starterFiles">Starter Files</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="pdfGuide">PDF Guide</SelectItem>
                  <SelectItem value="designFiles">Design Files</SelectItem>
                  <SelectItem value="sourceCode">Source Code</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="externalLink">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-teal-600" />
                Resources
              </CardTitle>
              <Button variant="secondary" size="sm" onClick={addResource}>
                <Plus className="w-4 h-4 mr-2" />Add Resource
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(block.resources || []).map((resource, idx) => (
              <Card key={resource.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1 space-y-3">
                      <Input value={resource.name} onChange={e => updateResource(resource.id, { name: e.target.value })} placeholder={`Resource ${idx + 1} Name`} />
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Upload File</label>
                        <Input type="file" accept=".zip,.pdf,.docx,.ppt,.png,.jpg,.jpeg,.js,.html,.css" onChange={(e) => handleFileChange(resource.id, e)} />
                        {resource.url && (
                          <div className="mt-2 text-sm text-slate-600">
                            {resource.name}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                        <Select value={resource.type} onValueChange={v => updateResource(resource.id, { type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="file">File</SelectItem>
                            <SelectItem value="external">External Link</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {resource.type === "external" && (
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">URL</label><Input value={resource.url} onChange={e => updateResource(resource.id, { url: e.target.value })} placeholder="https://example.com" /></div>
                      )}
                    </div>
                    {(block.resources || []).length > 1 && (
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeResource(resource.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Access Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-600" />
              Access Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Free Resource</label>
              <Switch checked={block.access?.free} onCheckedChange={v => update({ access: { ...block.access, free: v } })} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Premium Resource</label>
              <Switch checked={block.access?.premium} onCheckedChange={v => update({ access: { ...block.access, premium: v } })} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Download Enabled</label>
              <Switch checked={block.access?.enabled} onCheckedChange={v => update({ access: { ...block.access, enabled: v } })} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Public Visibility</label>
              <Switch checked={block.access?.public} onCheckedChange={v => update({ access: { ...block.access, public: v } })} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
};

// ===========================================
// BLOCK CARD
// ===========================================
function BlockCard({ block, onDelete, onEdit, onOpenDialog }) {
  const type = BLOCK_TYPES.find(t => t.id === block.type);
  const Icon = type?.icon || FileText;

  return (
    <Card className={cn("mb-3 cursor-pointer transition-all group hover:shadow-sm border-slate-200")} onClick={() => onOpenDialog(block.id)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <GripVertical className="w-5 h-5 text-slate-300 group-hover:text-slate-500 cursor-grab" />
            <div className={cn("p-2 rounded-lg", type?.bg)}><Icon className={cn("w-5 h-5", type?.color)} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900">{block.title || type?.label || "Untitled Block"}</div>
              <Badge variant="secondary" className="mt-1">{type?.label}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100" title="Edit block" onClick={(e) => { e.stopPropagation(); onEdit(block.id); }}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete block" onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function SkillBuilderPro() {
  const navigate = useNavigate();
  const { slug: editSlug } = useParams();
  const [searchParams] = useSearchParams();
  const legacyEditId = searchParams.get("edit");
  const isEditMode = Boolean(editSlug);
  const [activeStep, setActiveStep] = useState(1);

  const [lab, setLab] = useState({
    title: "",
    shortDescription: "",
    fullDescription: "",
    thumbnail: "",
    introVideoUrl: "",
    _thumbnailFile: null,
    _introVideoFile: null,
    platform: "AWS",
    lab_kind: "skill_builder",
    difficulty: "Beginner",
    duration: "",
    isFree: true,
    price: 0,
    currency: "INR",
    rating: 4.8,
    studentCount: 1200,
    technologies: [],
    requirements: [],
    recommendedKnowledge: [],
    learningOutcomes: [],
    objectives: [],
    certificateEnabled: false,
    certificateTitle: "",
    certificateType: "completion",
    certificateMinProgress: 80,
    certificateThumbnail: "",
    certificateDescription: "",
    certificateVerificationText: "",
    certificateRequireQuiz: false,
    certificateRequireTasks: false,
    certificationId: null,
    createdBy: "ALAR Labs"
  });

  const [modules, setModules] = useState([
    createEmptyModule()
  ]);

  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id);
  const [selectedLessonId, setSelectedLessonId] = useState(modules[0]?.lessons[0]?.id);
  const [activeTab, setActiveTab] = useState("structure");
  const [draggedId, setDraggedId] = useState(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [dialogBlockId, setDialogBlockId] = useState(null);
  const [draftBlock, setDraftBlock] = useState(null);
  const [blockTypeSelectorOpen, setBlockTypeSelectorOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [expandedPreviewModules, setExpandedPreviewModules] = useState([]);
  const [expandedPreviewLessons, setExpandedPreviewLessons] = useState([]);
  const [previewPublishTab, setPreviewPublishTab] = useState("overview");
  const [publishStatus, setPublishStatus] = useState("draft");
  const [previewItemIndex, setPreviewItemIndex] = useState(0);
  const [editLabId, setEditLabId] = useState(null);
  const [contentMetaDates, setContentMetaDates] = useState(null);
  const [loadingLab, setLoadingLab] = useState(false);
  const labDraftKey = getEditorDraftKey("skill-builder-editor", editSlug || "new");
  const draftPersistenceEnabled = !editSlug || !loadingLab;

  const restoreLabDraft = useCallback((draft) => {
    if (draft.lab) setLab((prev) => ({ ...prev, ...draft.lab }));
    if (draft.modules?.length) {
      setModules(draft.modules);
      setSelectedModuleId(draft.selectedModuleId || draft.modules[0]?.id);
      setSelectedLessonId(draft.selectedLessonId || draft.modules[0]?.lessons?.[0]?.id);
    }
    if (draft.activeStep) setActiveStep(draft.activeStep);
    if (draft.publishStatus) setPublishStatus(draft.publishStatus);
  }, []);

  useEditorDraftPersistence({
    storageKey: labDraftKey,
    enabled: draftPersistenceEnabled,
    onRestore: restoreLabDraft,
    getSnapshot: () => ({
      lab: stripEditorFileFields(lab),
      modules,
      activeStep,
      selectedModuleId,
      selectedLessonId,
      publishStatus,
    }),
    deps: [lab, modules, activeStep, selectedModuleId, selectedLessonId, publishStatus],
  });

  useEffect(() => {
    if (editSlug) {
      let cancelled = false;

      const loadLab = async () => {
        setLoadingLab(true);
        try {
          const response = await api.get(`/labs/slug/${encodeURIComponent(editSlug)}`, {
            withCredentials: true,
          });
          const rawLab = response.data?.data?.lab || response.data?.lab;
          if (!rawLab) throw new Error("Lab not found");

          const { lab: mappedLab, modules: mappedModules, labKind } = mapApiLabToModuleEditor(rawLab);
          if (labKind !== "skill_builder") {
            navigate(`/app/labs/edit/${editSlug}`, { replace: true });
            return;
          }

          if (!cancelled) {
            setEditLabId(rawLab.id);
            setContentMetaDates(pickContentTimestamps(rawLab));
            setPublishStatus(rawLab.status === "published" ? "published" : "draft");
            setLab((prev) => ({ ...prev, ...mappedLab, lab_kind: "skill_builder" }));
            setModules(mappedModules);
            const firstModule = mappedModules[0];
            if (firstModule) {
              setSelectedModuleId(firstModule.id);
              setSelectedLessonId(firstModule.lessons?.[0]?.id ?? null);
            }
          }
        } catch (error) {
          console.error("Failed to load lab for edit:", error);
          showError("Failed to load lab data.");
          navigate("/app/labs/mine");
        } finally {
          if (!cancelled) setLoadingLab(false);
        }
      };

      loadLab();
      return () => {
        cancelled = true;
      };
    }

    if (legacyEditId) {
      let cancelled = false;

      const redirectLegacyEdit = async () => {
        setLoadingLab(true);
        try {
          const response = await api.get(`/labs/${encodeURIComponent(legacyEditId)}`, {
            withCredentials: true,
          });
          const rawLab = response.data?.data?.lab || response.data?.lab;
          if (!rawLab?.slug) throw new Error("Lab not found");
          const meta = typeof rawLab.metadata === "object" ? rawLab.metadata : {};
          const kind = meta.lab_kind || rawLab.lab_kind;
          const path =
            kind === "skill_builder"
              ? `/app/labs/skill-builder-lab-edit/${rawLab.slug}`
              : `/app/labs/edit/${rawLab.slug}`;
          navigate(path, { replace: true });
        } catch (error) {
          console.error("Failed to resolve legacy edit URL:", error);
          showError("Could not open lab for editing.");
          navigate("/app/labs/mine", { replace: true });
        } finally {
          if (!cancelled) setLoadingLab(false);
        }
      };

      redirectLegacyEdit();
      return () => {
        cancelled = true;
      };
    }
  }, [editSlug, legacyEditId, navigate]);

  const currentModule = useMemo(() => modules.find(m => m.id === selectedModuleId), [modules, selectedModuleId]);
  const currentLesson = useMemo(() => currentModule?.lessons.find(l => l.id === selectedLessonId), [currentModule, selectedLessonId]);
  const dialogBlock = useMemo(() => {
    if (draftBlock) return draftBlock;
    if (!dialogBlockId || !currentLesson) return null;
    return currentLesson.blocks.find((b) => b.id === dialogBlockId) ?? null;
  }, [draftBlock, dialogBlockId, currentLesson]);

  // Sensors for DnD
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Handlers
  const updateLab = (field, value) => setLab({ ...lab, [field]: value });
  const addModule = () => setModules([...modules, createEmptyModule()]);
  const deleteModule = async (id) => {
    if (modules.length <= 1) return;
    const mod = modules.find((m) => m.id === id);
    const label = mod?.title?.trim() || "this module";
    if (!(await confirmDelete(`"${label}"`))) return;
    const newMods = modules.filter(m => m.id !== id);
    setModules(newMods);
    if (selectedModuleId === id) {
      setSelectedModuleId(newMods[0].id);
      setSelectedLessonId(newMods[0].lessons[0].id);
    }
  };
  const updateModule = (id, updates) => setModules(modules.map(m => m.id === id ? { ...m, ...updates } : m));

  const addLesson = () => { if (!currentModule) return; const newLesson = createEmptyLesson(); updateModule(currentModule.id, { lessons: [...currentModule.lessons, newLesson] }); setSelectedLessonId(newLesson.id); };
  const deleteLesson = (id) => { if (!currentModule || currentModule.lessons.length <= 1) return; const newLessons = currentModule.lessons.filter(l => l.id !== id); updateModule(currentModule.id, { lessons: newLessons }); if (selectedLessonId === id) setSelectedLessonId(newLessons[0].id); };
  const deleteLessonFrom = async (moduleId, lessonId) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod || mod.lessons.length <= 1) return;
    const lesson = mod.lessons.find(l => l.id === lessonId);
    const label = lesson?.title?.trim() || "this lesson";
    if (!(await confirmDelete(`"${label}"`))) return;
    const newLessons = mod.lessons.filter(l => l.id !== lessonId);
    updateModule(moduleId, { lessons: newLessons });
    if (selectedLessonId === lessonId) {
      setSelectedModuleId(moduleId);
      setSelectedLessonId(newLessons[0].id);
    }
  };
  const updateLesson = (id, updates) => { if (!currentModule) return; updateModule(currentModule.id, { lessons: currentModule.lessons.map(l => l.id === id ? { ...l, ...updates } : l) }); };

  const openEditBlock = (id) => {
    setDraftBlock(null);
    setDialogBlockId(id);
    setBlockDialogOpen(true);
  };
  const startNewBlock = (type) => {
    if (!currentLesson) return;
    const newBlock = createEmptyBlock(type);
    setDraftBlock(newBlock);
    setDialogBlockId(newBlock.id);
    setBlockDialogOpen(true);
  };
  const cancelBlockDialog = () => {
    setDraftBlock(null);
    setDialogBlockId(null);
    setBlockDialogOpen(false);
  };
  const saveBlockDialog = () => {
    if (draftBlock && currentLesson) {
      updateLesson(currentLesson.id, { blocks: [...currentLesson.blocks, draftBlock] });
    }
    setDraftBlock(null);
    setDialogBlockId(null);
    setBlockDialogOpen(false);
  };
  const handleDialogBlockChange = (updates) => {
    if (draftBlock) {
      setDraftBlock((prev) => ({ ...prev, ...updates }));
      return;
    }
    if (dialogBlockId) updateBlock(dialogBlockId, updates);
  };
  const deleteBlock = (id) => {
    if (!currentLesson) return;
    updateLesson(currentLesson.id, { blocks: currentLesson.blocks.filter(b => b.id !== id) });
    if (dialogBlockId === id) {
      setDialogBlockId(null);
      setDraftBlock(null);
    }
  };
  const updateBlock = (id, updates) => { if (!currentLesson) return; updateLesson(currentLesson.id, { blocks: currentLesson.blocks.map(b => b.id === id ? { ...b, ...updates } : b) }); };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch();

  const handleSaveLab = async () => {
    const errors = [];
    if (!lab.title.trim()) errors.push("Lab title is required");
    if (modules.length === 0) errors.push("At least 1 module is required");
    const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
    if (totalLessons === 0) errors.push("At least 1 lesson is required");
    const totalBlocks = modules.reduce((acc, m) => acc + m.lessons.reduce((a, l) => a + l.blocks.length, 0), 0);
    if (totalBlocks === 0) errors.push("At least 1 content block is required");

    setValidationErrors(errors);

    if (errors.length === 0) {
      try {
        setIsSubmitting(true);
        const publish = publishStatus === "published";
        const labPayload = {
          ...lab,
          status: publish ? "published" : "draft",
          lab_kind: "skill_builder",
          labType: "Skill Builder",
        };

        const result =
          isEditMode && editLabId
            ? await updateFullWithModules({ labId: editLabId, lab: labPayload, modules, dispatch })
            : await createFullWithModules({ lab: labPayload, modules, dispatch });

        if (result?.success || result?.data?.lab) {
          const labData = result.data?.lab || result;
          dispatch(setLastCreated({ id: labData.id, title: labData.title }));
          clearEditorDraft(labDraftKey);
          showSuccess(
            publish
              ? "Skill Builder lab published successfully!"
              : "Skill Builder lab saved as draft!"
          );
          navigate("/app/labs/mine");
        } else {
          showError(result?.message || (isEditMode ? "Failed to update lab" : "Failed to create lab"));
        }
      } catch (error) {
        console.error(isEditMode ? "Error updating lab:" : "Error creating lab:", error);
        showUploadOutcomeError(
          error,
          isEditMode ? "Failed to update lab" : "Failed to create lab"
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id && currentLesson) {
      const oldIndex = currentLesson.blocks.findIndex(b => b.id === active.id);
      const newIndex = currentLesson.blocks.findIndex(b => b.id === over.id);
      updateLesson(currentLesson.id, { blocks: arrayMove(currentLesson.blocks, oldIndex, newIndex) });
    }
    setDraggedId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {loadingLab ? (
        <div className="flex items-center justify-center min-h-[50vh] text-slate-600">
          Loading lab…
        </div>
      ) : (
      <>
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => activeStep > 1 ? setActiveStep(activeStep - 1) : navigate("/app/labs")}><ArrowLeft className="w-4 h-4 mr-2" />{activeStep > 1 ? "Previous" : "Back to Labs"}</Button>
            <div className="h-6 w-px bg-slate-300" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {lab.title || (isEditMode ? "Edit Skill Builder Lab" : "New Skill Builder Lab")}
              </h1>
              {contentMetaDates?.createdAt ? (
                <AdminContentDates
                  createdAt={contentMetaDates.createdAt}
                  updatedAt={contentMetaDates.updatedAt}
                  className="mt-0.5"
                />
              ) : null}
            </div>
          </div>

        </div>
      </div>

      {/* Steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {STEPS.map((step, index) => (
              <button key={step.id} onClick={() => setActiveStep(step.id)} className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                activeStep === step.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-600"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  activeStep === step.id ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                )}>{step.id}</div>
                <div className="hidden md:block">
                  <div className="font-semibold text-sm">{step.label}</div>
                  <div className="text-xs text-slate-400">{step.description}</div>
                </div>
                {index < STEPS.length - 1 && <ChevronRight className="w-5 h-5 text-slate-300" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4 py-8">
        {activeStep === 1 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader><CardTitle>Lab Information</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Lab Title</label>
                    <Input value={lab.title} onChange={e => updateLab("title", e.target.value)} className="text-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1"> Description</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Rich text — formatting appears the same on the lab overview page.
                    </p>
                    <QuillRichEditor
                      editorKey={editLabId || editSlug || "new-skill-builder-lab"}
                      value={lab.shortDescription || ""}
                      onChange={(html) => updateLab("shortDescription", html)}
                      placeholder="Describe what learners will do in this lab…"
                      minHeight={160}
                      maxHeight={320}
                    />
                  </div>
                  <OverviewMediaUploadSection
                    entityLabel="Skill Builder Lab"
                    value={{
                      thumbnail: lab.thumbnail,
                      _thumbnailFile: lab._thumbnailFile,
                      introVideoUrl: lab.introVideoUrl,
                      _introVideoFile: lab._introVideoFile,
                    }}
                    onChange={(media) => setLab((prev) => ({ ...prev, ...media }))}
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Platform</label>
                    <PlatformSelect
                      value={lab.platform || "AWS"}
                      onChange={(v) => updateLab("platform", v)}
                    />
                  </div>
                  {/* <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Description</label>
                    <Textarea value={lab.fullDescription} onChange={e => updateLab("fullDescription", e.target.value)} rows={4} />
                  </div> */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                      <Select value={lab.difficulty} onValueChange={v => updateLab("difficulty", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Duration</label>
                      <Input value={lab.duration} onChange={e => updateLab("duration", e.target.value)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><p className="text-sm font-medium">{lab.isFree ? "Free" : "Paid"}</p></div>
                        <Switch checked={!lab.isFree} onCheckedChange={v => updateLab("isFree", !v)} />
                      </div>
                    </div>
                  </div>
                  {!lab.isFree && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Currency</label>
                        <Select value={lab.currency || "INR"} onValueChange={v => updateLab("currency", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
                            <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                            <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                            <SelectItem value="AED">AED (د.إ) - UAE Dirham</SelectItem>
                            <SelectItem value="CAD">CAD (C$) - Canadian Dollar</SelectItem>
                            <SelectItem value="AUD">AUD (A$) - Australian Dollar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Price ({lab.currency === "USD" ? "$" : lab.currency === "EUR" ? "€" : lab.currency === "GBP" ? "£" : lab.currency === "AED" ? "د.إ" : lab.currency === "CAD" ? "C$" : lab.currency === "AUD" ? "A$" : "₹"})
                        </label>
                        <Input type="number" min="0" value={lab.price} onChange={e => updateLab("price", Number(e.target.value))} />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Rating (1-5)</label>
                      <Input type="number" step="0.1" min="1" max="5" value={lab.rating} onChange={e => updateLab("rating", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Student Count</label>
                      <Input type="number" value={lab.studentCount} onChange={e => updateLab("studentCount", Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Learning Details</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Technologies</label>
                  <div className="flex flex-wrap gap-2 mb-2">{lab.technologies.map((t, i) => (
                    <Badge key={i} className="flex items-center gap-1">
                      {t}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLab("technologies", lab.technologies.filter((_, idx) => idx !== i));
                        }}
                      >
                        <X className="w-3 h-3 ml-1" />
                      </button>
                    </Badge>
                  ))}</div>
                  <div className="flex gap-2">
                    <Input
                      id="tech-input"
                      placeholder="Add a technology (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && !lab.technologies.includes(val)) {
                            updateLab("technologies", [...lab.technologies, val]);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        const input = document.getElementById('tech-input');
                        const val = input.value.trim();
                        if (val && !lab.technologies.includes(val)) {
                          updateLab("technologies", [...lab.technologies, val]);
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Requirements</label>
                  <div className="flex flex-wrap gap-2 mb-2">{lab.requirements.map((r, i) => (
                    <Badge variant="outline" key={i} className="flex items-center gap-1">
                      {r}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLab("requirements", lab.requirements.filter((_, idx) => idx !== i));
                        }}
                      >
                        <X className="w-3 h-3 ml-1" />
                      </button>
                    </Badge>
                  ))}</div>
                  <div className="flex gap-2">
                    <Input
                      id="req-input"
                      placeholder="Add a requirement (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && !lab.requirements.includes(val)) {
                            updateLab("requirements", [...lab.requirements, val]);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        const input = document.getElementById('req-input');
                        const val = input.value.trim();
                        if (val && !lab.requirements.includes(val)) {
                          updateLab("requirements", [...lab.requirements, val]);
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Learning Outcomes</label>
                  <ul className="list-disc pl-5 space-y-1 mb-2">{lab.learningOutcomes.map((o, i) => (
                    <li key={i} className="text-slate-700 flex items-center gap-2">
                      {o}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLab("learningOutcomes", lab.learningOutcomes.filter((_, idx) => idx !== i));
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}</ul>
                  <div className="flex gap-2">
                    <Input
                      id="lo-input"
                      placeholder="Add a learning outcome (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && !lab.learningOutcomes.includes(val)) {
                            updateLab("learningOutcomes", [...lab.learningOutcomes, val]);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        const input = document.getElementById('lo-input');
                        const val = input.value.trim();
                        if (val && !lab.learningOutcomes.includes(val)) {
                          updateLab("learningOutcomes", [...lab.learningOutcomes, val]);
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Objectives</label>
                  <ul className="list-disc pl-5 space-y-1 mb-2">{lab.objectives.map((o, i) => (
                    <li key={i} className="text-slate-700 flex items-center gap-2">
                      {o}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLab("objectives", lab.objectives.filter((_, idx) => idx !== i));
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}</ul>
                  <div className="flex gap-2">
                    <Input
                      id="obj-input"
                      placeholder="Add an objective (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && !lab.objectives.includes(val)) {
                            updateLab("objectives", [...lab.objectives, val]);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        const input = document.getElementById('obj-input');
                        const val = input.value.trim();
                        if (val && !lab.objectives.includes(val)) {
                          updateLab("objectives", [...lab.objectives, val]);
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  Completion Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-semibold">{lab.certificateEnabled ? "Certificate Enabled ✅" : "Certificate Disabled"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{lab.certificateEnabled ? "Students will receive a certificate upon completion" : "No certificate will be issued"}</p>
                  </div>
                  <Switch checked={!!lab.certificateEnabled} onCheckedChange={v => updateLab("certificateEnabled", v)} />
                </div>
                <LabCertificateConfigFields
                  enabled={lab.certificateEnabled}
                  certificationId={lab.certificationId}
                  certificateTitle={lab.certificateTitle}
                  onCertificationIdChange={(id) => updateLab("certificationId", id)}
                  onCertificateTitleChange={(title) => updateLab("certificateTitle", title)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {activeStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Sidebar - Course Structure */}
            <div className="col-span-1 lg:col-span-3">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>Course Structure</CardTitle>
                    <Button variant="ghost" size="sm" onClick={addModule}><Plus className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="p-3 space-y-3">
                      {modules.map((mod, mIdx) => (
                        <div key={mod.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">{mIdx + 1}</div>
                            <Input
                              value={mod.title}
                              onChange={e => updateModule(mod.id, { title: e.target.value })}
                              className="flex-1 font-medium text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateModule(mod.id, { expanded: !mod.expanded })}
                            >
                              {mod.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            {modules.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500"
                                onClick={() => deleteModule(mod.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {mod.expanded && (
                            <div className="pl-11 space-y-2">
                              {mod.lessons.map((les, lIdx) => (
                                <div
                                  key={les.id}
                                  className={cn(
                                    "group w-full flex items-center gap-1 p-2 rounded-lg transition-all",
                                    selectedLessonId === les.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedModuleId(mod.id); setSelectedLessonId(les.id); }}
                                    className="flex flex-1 items-center gap-2 text-left min-w-0"
                                  >
                                    <FileText className={cn("w-4 h-4 shrink-0", selectedLessonId === les.id ? "text-blue-600" : "text-slate-400")} />
                                    <span className="flex-1 min-w-0">
                                      <span className="block text-sm text-slate-900 truncate">{lIdx + 1}. {les.title}</span>
                                      <span className="block text-xs text-slate-400">{les.blocks.length} content blocks</span>
                                    </span>
                                  </button>
                                  {mod.lessons.length > 1 && (
                                    <button
                                      type="button"
                                      title="Delete lesson"
                                      onClick={(e) => { e.stopPropagation(); deleteLessonFrom(mod.id, les.id); }}
                                      className="shrink-0 p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 transition"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={addLesson}
                                className="w-full text-blue-600"
                              >
                                <Plus className="w-4 h-4 mr-1" />Add Lesson
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Center Area - Lesson Content Canvas */}
            <div className="col-span-1 lg:col-span-9">
              {currentModule && currentLesson ? (
                <Card className="h-full">
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{currentLesson.title}</CardTitle>
                          <p className="text-sm text-slate-500 mt-1">
                            {currentLesson.blocks.length} {currentLesson.blocks.length === 1 ? "content block" : "content blocks"}
                          </p>
                        </div>
                      </div>
                      <Input
                        value={currentLesson.title}
                        onChange={e => updateLesson(currentLesson.id, { title: e.target.value })}
                        className="text-base"
                        placeholder="Lesson title"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {currentLesson.blocks.map((block, index) => {
                        const type = BLOCK_TYPES.find(t => t.id === block.type);
                        const Icon = type?.icon || FileText;
                        return (
                          <Card
                            key={block.id}
                            className="cursor-pointer transition-all group hover:shadow-sm border-slate-200"
                            onClick={() => openEditBlock(block.id)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                  <div className={cn("p-2.5 rounded-lg", type?.bg)}>
                                    <Icon className={cn("w-6 h-6", type?.color)} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-slate-900">
                                      {block.title || type?.label || "Untitled Block"}
                                    </div>
                                    <Badge variant="secondary" className="mt-2">
                                      {type?.label}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                    title="Edit block"
                                    onClick={(e) => { e.stopPropagation(); openEditBlock(block.id); }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      <Button
                        className="w-full py-6 bg-black text-white hover:bg-neutral-800"
                        onClick={() => setBlockTypeSelectorOpen(true)}
                      >
                        <Plus className="w-5 h-5 mr-2" />Add Content Block
                      </Button>

                      {currentLesson.blocks.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <Layout className="w-14 h-14 mx-auto mb-4 opacity-20" />
                          <p className="text-sm">No content blocks yet</p>
                          <p className="text-xs mt-1">Click "Add Content Block" to start</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-20 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-base">Select a lesson from the sidebar</p>
                    <p className="text-sm mt-2">to start adding content</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="max-w-6xl mx-auto space-y-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <h2 className="text-lg font-bold text-green-800">Preview & Publish</h2>
                    <p className="text-sm text-green-700">Review how learners will see your lab, then publish or save as draft.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={previewPublishTab} onValueChange={setPreviewPublishTab}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="overview">Overview Page</TabsTrigger>
                <TabsTrigger value="detail">Detail / Progress</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <p className="text-sm text-slate-500 mb-4">This is how other people will see your lab before enrolling.</p>
                <LabOverviewPreviewPanel
                  lab={lab}
                  modules={modules}
                  expandedPreviewModules={expandedPreviewModules}
                  setExpandedPreviewModules={setExpandedPreviewModules}
                  expandedPreviewLessons={expandedPreviewLessons}
                  setExpandedPreviewLessons={setExpandedPreviewLessons}
                  blockTypes={BLOCK_TYPES}
                />
              </TabsContent>
              <TabsContent value="detail" className="mt-4">
                <p className="text-sm text-slate-500 mb-4">This is how enrolled learners will see progress and move through content.</p>
                <LabDetailProgressPreviewPanel
                  modules={modules}
                  blockTypes={BLOCK_TYPES}
                  previewItemIndex={previewItemIndex}
                  setPreviewItemIndex={setPreviewItemIndex}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <ValidationErrorBanner
          errors={validationErrors}
          onDismiss={() => setValidationErrors([])}
        />

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40">
          <div className="container mx-auto flex items-center justify-between">
            {activeStep === 3 ? (
              <>
                <Button variant="secondary" onClick={() => setActiveStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />Back
                </Button>
                <div className="text-sm text-slate-500">Step {activeStep} of {STEPS.length}</div>
                <div className="flex items-center gap-3">
                  <Select value={publishStatus} onValueChange={setPublishStatus}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Lab status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft (Submit for Review)</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className={cn(
                      publishStatus === "published"
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    )}
                    onClick={handleSaveLab}
                    disabled={isSubmitting}
                  >
                    {publishStatus === "published" ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {isSubmitting ? "Publishing…" : (isEditMode ? "Publish Skill Builder Lab" : "Publish Skill Builder Lab")}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isSubmitting ? "Saving…" : (isEditMode ? "Save as Draft" : "Save as Draft")}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setActiveStep(Math.max(1, activeStep - 1))} disabled={activeStep === 1}>
                  <ArrowLeft className="w-4 h-4 mr-2" />Previous
                </Button>
                <div className="text-sm text-slate-500">Step {activeStep} of {STEPS.length}</div>
                <Button onClick={() => setActiveStep(activeStep + 1)}>Next<ArrowRight className="w-4 h-4 ml-2" /></Button>
              </>
            )}
          </div>
        </div>
        <div className="h-20"></div>

        {/* Block Type Selector Modal */}
        <Dialog open={blockTypeSelectorOpen} onOpenChange={setBlockTypeSelectorOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Content Block</DialogTitle>
            </DialogHeader>
            <div className="py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {BLOCK_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      startNewBlock(type.id);
                      setBlockTypeSelectorOpen(false);
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <div className={cn("p-3 rounded-full", type.bg)}>
                        <Icon className={cn("w-6 h-6", type.color)} />
                      </div>
                      <div className="font-medium text-sm">{type.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBlockTypeSelectorOpen(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block Configuration Dialog */}
        <Dialog
          open={blockDialogOpen}
          onOpenChange={(open) => {
            if (!open) cancelBlockDialog();
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
            <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
              <DialogTitle>
                {(() => {
                  const type = dialogBlock ? BLOCK_TYPES.find((t) => t.id === dialogBlock.type) : null;
                  return draftBlock ? `Add ${type?.label || "Block"}` : `Edit ${type?.label || "Block"}`;
                })()}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {(() => {
                const BlockEditor = dialogBlock ? BLOCK_EDITORS[dialogBlock.type] : null;
                return dialogBlock && BlockEditor ? (
                  <BlockEditor block={dialogBlock} onChange={handleDialogBlockChange} />
                ) : null;
              })()}
            </div>
            <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
              <Button variant="secondary" onClick={cancelBlockDialog}>Cancel</Button>
              <Button onClick={saveBlockDialog}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </>
      )}
    </div>
  );
}

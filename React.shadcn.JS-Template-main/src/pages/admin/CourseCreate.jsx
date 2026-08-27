import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";
import { isApprover } from "@/lib/auth";
import { toast } from "@/lib/toast";
import { mapApiCourseToEditor } from "@/lib/mapCourseToEditor";
import { showError, showUploadOutcomeError } from "@/lib/toast-utils";
import {
  clearEditorDraft,
  getEditorDraftKey,
  stripEditorFileFields,
  useEditorDraftPersistence,
} from "@/lib/editorDraftPersistence";
import { isUploadAbortError } from "@/lib/uploadAbortRegistry";
import { useGetLabsQuery } from "@/store/api/labApi";
import { useGetActiveCategoriesQuery } from "@/store/api/categoryApi";
import {
  useCreateCourseMutation,
  useUpdateCourseMutation,
  usePublishCourseMutation,
  useCreateFullMutation
} from "@/store/api/courseApi";
import { useDispatch } from "react-redux";
import { createCourseFullWithModules, updateCourseFullWithModules } from "@/lib/uploadWithProgress";
import { start, progress, complete, fail, hide } from "@/store/slices/uploadSlice";
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
  FlaskConical,
  Clock,
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
import { stripHtmlToPlain } from "@/lib/stripHtml";
import RichTextContent from "@/components/learning/RichTextContent";
import { getRichTextBlockTitle } from "@/lib/richTextUtils";
import OverviewMediaUploadSection from "@/components/admin/OverviewMediaUploadSection";
import RichTextBlockEditor from "@/components/editor/RichTextBlockEditor";
import TipTapRichEditor from "@/components/editor/TipTapRichEditor";
import "@/styles/tiptap-editor.css";
import AlertBlockEditor from "@/components/editor/AlertBlockEditor";
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
  { id: 1, label: "Course Info", icon: FileText, description: "Basic course details" },
  { id: 2, label: "Lesson Content", icon: BookOpen, description: "Modules, lessons & content" },
  { id: 3, label: "Course Settings", icon: Layout, description: "Configure access & progress" },
  { id: 4, label: "Preview & Publish", icon: Eye, description: "Review and publish course" },
];

const PLATFORMS = ["AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Linux", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const CODE_LANGS = ["bash", "python", "javascript", "typescript", "yaml", "json", "sql", "dockerfile", "go"];

// DUMMY DATA FOR EXISTING LABS
const EXISTING_NORMAL_LABS = [
  { id: "n1", title: "React Setup & Basic Concepts", type: "normal", duration: 45, difficulty: "Beginner" },
  { id: "n2", title: "Docker Fundamentals", type: "normal", duration: 60, difficulty: "Beginner" },
  { id: "n3", title: "AWS EC2 Introduction", type: "normal", duration: 90, difficulty: "Intermediate" },
  { id: "n4", title: "Git & Version Control", type: "normal", duration: 30, difficulty: "Beginner" },
  { id: "n5", title: "CSS Flexbox & Grid", type: "normal", duration: 45, difficulty: "Beginner" },
  { id: "n6", title: "TypeScript Basics", type: "normal", duration: 60, difficulty: "Intermediate" }
];

const EXISTING_SKILL_BUILDER_LABS = [
  { id: "s1", title: "Hero Component Builder", type: "skill_builder", duration: 30, difficulty: "Beginner" },
  { id: "s2", title: "Todo App with React", type: "skill_builder", duration: 60, difficulty: "Intermediate" },
  { id: "s3", title: "REST API with Node.js", type: "skill_builder", duration: 90, difficulty: "Advanced" },
  { id: "s4", title: "Responsive Navbar Challenge", type: "skill_builder", duration: 45, difficulty: "Beginner" },
  { id: "s5", title: "Form Validation with React Hook Form", type: "skill_builder", duration: 60, difficulty: "Intermediate" },
  { id: "s6", title: "Shopping Cart with Redux", type: "skill_builder", duration: 90, difficulty: "Advanced" }
];

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
  type: "lesson",
  title: "New Lesson",
  blocks: []
});

const createEmptyModule = () => ({
  id: uid(),
  title: "New Module",
  expanded: true,
  items: [createEmptyLesson()]
});

// ===========================================
// SORTABLE COMPONENT
// ===========================================
function SortableItem({ id, children, isOverlay }) {
  const { attributes, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto"
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children}
    </div>
  );
}

// DRAG HANDLE COMPONENT
// ===========================================
function DragHandle({ id }) {
  const { listeners } = useSortable({ id });
  return <GripVertical className="w-5 h-5 text-slate-400 mt-1 cursor-grab" {...listeners} />;
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
                    <Input value={video.url} onChange={e => updateVideo(video.id, { url: e.target.value, localFile: null })} placeholder="https://example.com/video.mp4" />
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
        updateImage(imageId, { file, localFile: file, url });
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
                        <Input value={image.url} onChange={e => updateImage(image.id, { url: e.target.value, file: null, localFile: null })} placeholder="https://example.com/image.jpg" />
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
// COURSE PREVIEW PANELS (steps 4 & 5)
// ===========================================
function CourseOverviewPreviewPanel({
  lab,
  modules,
  expandedPreviewModules,
  setExpandedPreviewModules,
  expandedPreviewLessons,
  setExpandedPreviewLessons,
  blockTypes,
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {lab.thumbnail && (
              <div className="md:w-64 flex-shrink-0">
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <img src={lab.thumbnail} alt={lab.title} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {lab.difficulty && <Badge variant="outline" className="text-xs">{lab.difficulty}</Badge>}
                {lab.isFree ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">Free</Badge>
                ) : (
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs">Paid - ${lab.price}</Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">{lab.title || "Untitled Course"}</h1>
              <p className="text-sm text-slate-600 mb-3">{lab.shortDescription || "No description provided"}</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={i <= Math.round(lab.rating) ? "text-yellow-400" : "text-slate-300"}>⭐</span>
                    ))}
                  </div>
                  <span className="text-sm text-slate-600">{lab.rating} ({(lab.studentCount || 0).toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Layers className="w-4 h-4" />
                  <span className="text-sm">{modules.length} {modules.length === 1 ? "Module" : "Modules"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">{modules.reduce((acc, m) => acc + m.items.length, 0)} Items</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 items-start">
        <div className="space-y-4">
          {lab.technologies?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Technologies</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {lab.technologies.map((tech, i) => <Badge key={i} className="text-xs">{tech}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
          {lab.requirements?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Requirements</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5">
                  {lab.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {lab.learningOutcomes?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">What you&apos;ll learn</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5">
                  {lab.learningOutcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Course Content</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {modules.map((mod, mIdx) => {
              const isExpanded = expandedPreviewModules.includes(mod.id);
              return (
                <div key={mod.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedPreviewModules(
                      isExpanded ? expandedPreviewModules.filter((id) => id !== mod.id) : [...expandedPreviewModules, mod.id]
                    )}
                    className="w-full bg-slate-50 px-3 py-2.5 flex items-center justify-between hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">{mIdx + 1}</div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-slate-900">{mod.title || "Untitled Module"}</p>
                        <p className="text-xs text-slate-500">{mod.items.length} Items</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="bg-white p-2.5 space-y-1.5 border-t border-slate-100">
                      {mod.items.map((item) => {
                        const isLessonExpanded = expandedPreviewLessons.includes(item.id);
                        const isLab = item.type === "normal_lab" || item.type === "skill_builder_lab";
                        return (
                          <div key={item.id} className="border border-slate-100 rounded-md overflow-hidden">
                            {item.type === "lesson" ? (
                              <button
                                type="button"
                                onClick={() => setExpandedPreviewLessons(
                                  isLessonExpanded
                                    ? expandedPreviewLessons.filter((id) => id !== item.id)
                                    : [...expandedPreviewLessons, item.id]
                                )}
                                className="w-full flex items-center gap-2.5 p-2 hover:bg-slate-50 transition-colors"
                              >
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center ml-10">
                                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-medium text-sm text-slate-900 truncate">{item.title || "Untitled Lesson"}</p>
                                  <p className="text-xs text-slate-500">{item.blocks?.length || 0} blocks</p>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isLessonExpanded ? "rotate-180" : ""}`} />
                              </button>
                            ) : (
                              <div className="flex items-center gap-2.5 p-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center ml-10" style={{ backgroundColor: item.type === "normal_lab" ? "#fef3c7" : "#f3e8ff" }}>
                                  {item.type === "normal_lab" ? (
                                    <FlaskConical className="w-3.5 h-3.5" style={{ color: "#d97706" }} />
                                  ) : (
                                    <Zap className="w-3.5 h-3.5" style={{ color: "#9333ea" }} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-medium text-sm text-slate-900 truncate">{item.title || "Untitled Lab"}</p>
                                  <p className="text-xs text-slate-500">
                                    {isLab ? (item.type === "normal_lab" ? "Learning Lab" : "Skill Builder Lab") : item.type}
                                  </p>
                                </div>
                              </div>
                            )}
                            {item.type === "lesson" && isLessonExpanded && item.blocks?.length > 0 && (
                              <div className="bg-slate-50 p-2 ml-12 space-y-1.5 border-t border-slate-100">
                                {item.blocks.map((block) => {
                                  const typeConfig = blockTypes.find((t) => t.id === block.type);
                                  const IconComponent = typeConfig?.icon || FileText;
                                  return (
                                    <div key={block.id} className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200">
                                      <div className={`w-6 h-6 rounded flex items-center justify-center ${typeConfig?.bg || "bg-slate-100"}`}>
                                        <IconComponent className={`w-3.5 h-3.5 ${typeConfig?.color || "text-slate-600"}`} />
                                      </div>
                                      <span className="text-sm text-slate-700 truncate">{block.title || typeConfig?.label || "Untitled Block"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CourseDetailProgressPreviewPanel({ modules, blockTypes, previewItemIndex, setPreviewItemIndex }) {
  const flatItems = useMemo(() => {
    const items = [];
    modules.forEach((mod, mIdx) => {
      mod.items.forEach((item, iIdx) => {
        items.push({ ...item, moduleTitle: mod.title, moduleIndex: mIdx, itemIndex: iIdx });
      });
    });
    return items;
  }, [modules]);

  const current = flatItems[previewItemIndex] || flatItems[0];
  const progressPct = flatItems.length ? Math.round(((previewItemIndex + 1) / flatItems.length) * 100) : 0;

  if (!flatItems.length) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center text-slate-500">Add modules and lessons to preview the learner experience.</CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Your Progress</CardTitle>
          <p className="text-xs text-slate-500">{progressPct}% complete (preview)</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {modules.map((mod, mIdx) => (
              <div key={mod.id} className="border border-slate-200 rounded-lg p-2">
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Module {mIdx + 1}: {mod.title || "Untitled"}</p>
                {mod.items.map((item, iIdx) => {
                  const globalIdx = flatItems.findIndex((fi) => fi.id === item.id);
                  const isActive = globalIdx === previewItemIndex;
                  const isDone = globalIdx < previewItemIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreviewItemIndex(globalIdx)}
                      className={cn(
                        "w-full flex items-center gap-2 p-1.5 rounded text-left text-sm",
                        isActive ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : isActive ? (
                        <Play className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className="truncate">{item.title || "Untitled"}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 border-b">
          <p className="text-xs text-slate-500">{current?.moduleTitle}</p>
          <CardTitle className="text-lg">{current?.title || "Lesson"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 min-h-[360px]">
          {current?.type === "lesson" && current.blocks?.length > 0 ? (
            current.blocks.map((block) => {
              const typeConfig = blockTypes.find((t) => t.id === block.type);
              const IconComponent = typeConfig?.icon || FileText;
              return (
                <div key={block.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${typeConfig?.bg || "bg-slate-100"}`}>
                      <IconComponent className={`w-4 h-4 ${typeConfig?.color || "text-slate-600"}`} />
                    </div>
                    <h4 className="font-semibold text-slate-900">
                      {block.type === "richText"
                        ? getRichTextBlockTitle(block)
                        : block.title || typeConfig?.label}
                    </h4>
                  </div>
                  {block.type === "video" && block.videos?.[0]?.url && (
                    <video src={block.videos[0].url} controls className="w-full rounded-lg max-h-48 bg-black" />
                  )}
                  {block.type === "richText" && block.content && (
                    <RichTextContent
                      html={block.content}
                      showTitle={false}
                      className="text-sm max-h-40 overflow-hidden"
                    />
                  )}
                  {block.type === "quiz" && (
                    <p className="text-sm text-slate-500">{block.questions?.length || 0} quiz question(s)</p>
                  )}
                </div>
              );
            })
          ) : current?.type === "normal_lab" || current?.type === "skill_builder_lab" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FlaskConical className="w-12 h-12 text-amber-500 mb-3" />
              <p className="font-medium text-slate-800">{current.title}</p>
              <p className="text-sm text-slate-500 mt-1">Learner opens the linked lab workspace from here</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No content blocks in this lesson yet.</p>
          )}
        </CardContent>
        <div className="px-6 pb-4 flex justify-end border-t pt-4">
          <Button
            type="button"
            onClick={() => setPreviewItemIndex((i) => Math.min(i + 1, flatItems.length - 1))}
            disabled={previewItemIndex >= flatItems.length - 1}
          >
            Next<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function SkillBuilderPro() {
  const navigate = useNavigate();
  const { slug: editSlug } = useParams();
  const dispatch = useDispatch();

  const userIsApprover = isApprover();
  useEffect(() => {
    if (userIsApprover) {
      toast.error("Content Approvers are not permitted to create or edit courses.");
      navigate("/app/course-approval", { replace: true });
    }
  }, [userIsApprover, navigate]);

  const [activeStep, setActiveStep] = useState(1);
  const [editCourseId, setEditCourseId] = useState(null);
  const [contentMetaDates, setContentMetaDates] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(!!editSlug);
  const [createCourse] = useCreateCourseMutation();
  const [updateCourse] = useUpdateCourseMutation();
  const [publishCourse] = usePublishCourseMutation();
  const [createFull] = useCreateFullMutation();

  // RTK Query hooks for dynamic data
  const { data: labsData, isLoading: labsLoading, error: labsError } = useGetLabsQuery({ limit: 100 });
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useGetActiveCategoriesQuery();

  // Debug logs
  console.log("labsData:", labsData);
  console.log("labsLoading:", labsLoading);
  console.log("labsError:", labsError);
  console.log("categoriesData:", categoriesData);
  console.log("categoriesLoading:", categoriesLoading);
  console.log("categoriesError:", categoriesError);

  // Extract labs from API response
  const apiLabs = useMemo(() => {
    if (!labsData) return [];
    const data = labsData?.data?.rows || labsData?.data?.items || labsData?.rows || labsData?.items || labsData?.data || [];
    console.log("apiLabs:", data);
    return Array.isArray(data) ? data : [];
  }, [labsData]);

  // Split into normal labs and skill builder labs
  const dynamicNormalLabs = useMemo(() => {
    const result = apiLabs.filter(lab => {
      const labKind = lab.lab_kind || lab.metadata?.lab_kind;
      console.log("Checking lab for normal:", lab, "labKind:", labKind);
      return labKind !== "skill_builder";
    }).map(lab => ({
      id: lab.id || lab._id,
      title: lab.title,
      type: "normal",
      duration: lab.duration || (typeof lab.time_limit_minutes === "number" ? lab.time_limit_minutes : 30),
      difficulty: lab.level || (lab.difficulty ?
        lab.difficulty === "easy" ? "Beginner" :
          lab.difficulty === "medium" ? "Intermediate" :
            lab.difficulty === "hard" ? "Advanced" :
              lab.difficulty.charAt(0).toUpperCase() + lab.difficulty.slice(1)
        : "Beginner")
    }));
    console.log("dynamicNormalLabs:", result);
    return result;
  }, [apiLabs]);

  const dynamicSkillBuilderLabs = useMemo(() => {
    const result = apiLabs.filter(lab => {
      const labKind = lab.lab_kind || lab.metadata?.lab_kind;
      console.log("Checking lab for skill builder:", lab, "labKind:", labKind);
      return labKind === "skill_builder";
    }).map(lab => ({
      id: lab.id || lab._id,
      title: lab.title,
      type: "skill_builder",
      duration: lab.duration || (typeof lab.time_limit_minutes === "number" ? lab.time_limit_minutes : 30),
      difficulty: lab.level || (lab.difficulty ?
        lab.difficulty === "easy" ? "Beginner" :
          lab.difficulty === "medium" ? "Intermediate" :
            lab.difficulty === "hard" ? "Advanced" :
              lab.difficulty.charAt(0).toUpperCase() + lab.difficulty.slice(1)
        : "Beginner")
    }));
    console.log("dynamicSkillBuilderLabs:", result);
    return result;
  }, [apiLabs]);

  // Extract categories from API
  const dynamicCategories = useMemo(() => {
    if (!categoriesData) return [];
    const data = categoriesData?.data?.rows || categoriesData?.data?.items || categoriesData?.rows || categoriesData?.items || categoriesData?.data || categoriesData || [];
    return Array.isArray(data) ? data : [];
  }, [categoriesData]);

  // Fallback to dummy data if API data is empty
  const finalNormalLabs = dynamicNormalLabs.length > 0 ? dynamicNormalLabs : EXISTING_NORMAL_LABS;
  const finalSkillBuilderLabs = dynamicSkillBuilderLabs.length > 0 ? dynamicSkillBuilderLabs : EXISTING_SKILL_BUILDER_LABS;
  console.log("finalNormalLabs:", finalNormalLabs);
  console.log("finalSkillBuilderLabs:", finalSkillBuilderLabs);

  const [lab, setLab] = useState({
    title: "",
    shortDescription: "",
    fullDescription: "",
    thumbnail: "",
    introVideoUrl: "",
    _thumbnailFile: null,
    _introVideoFile: null,
    platform: "AWS",
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
    createdBy: "ALAR Labs",
    hasCertificate: false,
    certificateName: "Completion Certificate",
    certificationId: null,
    hasDiscount: false,
    discountPercentage: 0,
    discountStartDate: "",
    discountEndDate: "",
    categoryId: null
  });

  const [modules, setModules] = useState([
    createEmptyModule()
  ]);

  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id);
  const [selectedLessonId, setSelectedLessonId] = useState(modules[0]?.items[0]?.id);
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
  const [previewItemIndex, setPreviewItemIndex] = useState(0);
  const [normalLabModalOpen, setNormalLabModalOpen] = useState(false);
  const [skillBuilderLabModalOpen, setSkillBuilderLabModalOpen] = useState(false);
  const [currentModuleForLab, setCurrentModuleForLab] = useState(null);
  const [replacingItemId, setReplacingItemId] = useState(null);
  const [normalLabSearch, setNormalLabSearch] = useState("");
  const [skillBuilderLabSearch, setSkillBuilderLabSearch] = useState("");
  const [normalLabPage, setNormalLabPage] = useState(1);
  const [skillBuilderLabPage, setSkillBuilderLabPage] = useState(1);
  const LABS_PER_PAGE = 10;
  const [publishStatus, setPublishStatus] = useState("draft");
  const courseDraftKey = getEditorDraftKey("course-editor", editSlug || "new");
  const draftPersistenceEnabled = !editSlug || !loadingCourse;

  const restoreCourseDraft = useCallback((draft) => {
    if (draft.lab) setLab((prev) => ({ ...prev, ...draft.lab }));
    if (draft.modules?.length) {
      setModules(draft.modules);
      setSelectedModuleId(draft.selectedModuleId || draft.modules[0]?.id);
      setSelectedLessonId(
        draft.selectedLessonId || draft.modules[0]?.items?.[0]?.id || null,
      );
    }
    if (draft.activeStep) {
      const legacy = draft.activeStep;
      const mapped = legacy <= 1 ? 1 : legacy === 2 ? 2 : Math.min(legacy - 1, 4);
      setActiveStep(mapped);
    }
    if (draft.publishStatus) setPublishStatus(draft.publishStatus);
  }, []);

  useEditorDraftPersistence({
    storageKey: courseDraftKey,
    enabled: draftPersistenceEnabled,
    onRestore: restoreCourseDraft,
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
    if (!editSlug) return;
    let cancelled = false;

    const loadCourse = async () => {
      setLoadingCourse(true);
      try {
        const response = await api.get(`/owner/courses/slug/${encodeURIComponent(editSlug)}`, {
          withCredentials: true,
        });
        const rawCourse = response.data?.data?.course || response.data?.course || response.data?.data;
        const mapped = mapApiCourseToEditor(rawCourse);
        if (!mapped) throw new Error("Course not found");

        if (!cancelled) {
          setEditCourseId(mapped.courseId);
          setContentMetaDates(pickContentTimestamps(rawCourse));
          setLab((prev) => ({ ...prev, ...mapped.course }));
          if (mapped.modules?.length) {
            setModules(mapped.modules);
            setSelectedModuleId(mapped.modules[0].id);
            setSelectedLessonId(mapped.modules[0].items?.[0]?.id ?? null);
          }
          const rawStatus = String(rawCourse?.status || "draft").toLowerCase();
          setPublishStatus(rawStatus === "published" ? "published" : "draft");
        }
      } catch (error) {
        console.error("Failed to load course for edit:", error);
        showError("Failed to load course", "Could not load course data for editing.");
        navigate("/app/courses/mine");
      } finally {
        if (!cancelled) setLoadingCourse(false);
      }
    };

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [editSlug, navigate]);

  const currentModule = useMemo(() => modules.find(m => m.id === selectedModuleId), [modules, selectedModuleId]);
  const currentItem = useMemo(() => currentModule?.items.find(i => i.id === selectedLessonId), [currentModule, selectedLessonId]);
  const dialogBlock = useMemo(() => {
    if (draftBlock) return draftBlock;
    if (!dialogBlockId || currentItem?.type !== "lesson") return null;
    return currentItem.blocks.find((b) => b.id === dialogBlockId) ?? null;
  }, [draftBlock, dialogBlockId, currentItem]);

  const filteredNormalLabs = useMemo(() => {
    return finalNormalLabs.filter(lab =>
      lab.title.toLowerCase().includes(normalLabSearch.toLowerCase())
    );
  }, [finalNormalLabs, normalLabSearch]);

  const paginatedNormalLabs = useMemo(() => {
    return filteredNormalLabs.slice(0, normalLabPage * LABS_PER_PAGE);
  }, [filteredNormalLabs, normalLabPage, LABS_PER_PAGE]);

  const hasMoreNormalLabs = useMemo(() => {
    return paginatedNormalLabs.length < filteredNormalLabs.length;
  }, [paginatedNormalLabs, filteredNormalLabs]);

  const filteredSkillBuilderLabs = useMemo(() => {
    return finalSkillBuilderLabs.filter(lab =>
      lab.title.toLowerCase().includes(skillBuilderLabSearch.toLowerCase())
    );
  }, [finalSkillBuilderLabs, skillBuilderLabSearch]);

  const paginatedSkillBuilderLabs = useMemo(() => {
    return filteredSkillBuilderLabs.slice(0, skillBuilderLabPage * LABS_PER_PAGE);
  }, [filteredSkillBuilderLabs, skillBuilderLabPage, LABS_PER_PAGE]);

  const hasMoreSkillBuilderLabs = useMemo(() => {
    return paginatedSkillBuilderLabs.length < filteredSkillBuilderLabs.length;
  }, [paginatedSkillBuilderLabs, filteredSkillBuilderLabs]);

  // Sensors for DnD
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Debug modal state
  useEffect(() => {
    console.log("normalLabModalOpen:", normalLabModalOpen);
    console.log("skillBuilderLabModalOpen:", skillBuilderLabModalOpen);
    console.log("currentModuleForLab:", currentModuleForLab);
  }, [normalLabModalOpen, skillBuilderLabModalOpen, currentModuleForLab]);

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
      setSelectedLessonId(newMods[0].items[0].id);
    }
  };
  const updateModule = (id, updates) => setModules(modules.map(m => m.id === id ? { ...m, ...updates } : m));

  const addLessonToModule = (moduleId) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;
    const newLesson = createEmptyLesson();
    const updatedModules = modules.map(m => m.id === moduleId ? { ...m, items: [...m.items, newLesson] } : m);
    setModules(updatedModules);
    setSelectedModuleId(moduleId);
    setSelectedLessonId(newLesson.id);
  };

  const attachNormalLabToModule = (moduleId, lab) => {
    const newItem = {
      id: replacingItemId || uid(),
      type: "normal_lab",
      title: lab.title,
      reference_id: lab.id,
      duration: lab.duration,
      difficulty: lab.difficulty
    };
    const updatedModules = modules.map(m => {
      if (m.id === moduleId) {
        if (replacingItemId) {
          return { ...m, items: m.items.map(i => i.id === replacingItemId ? newItem : i) };
        } else {
          return { ...m, items: [...m.items, newItem] };
        }
      }
      return m;
    });
    setModules(updatedModules);
    setNormalLabModalOpen(false);
    setCurrentModuleForLab(null);
    setReplacingItemId(null);
    if (replacingItemId) {
      setSelectedLessonId(newItem.id);
    }
  };

  const attachSkillBuilderLabToModule = (moduleId, lab) => {
    const newItem = {
      id: replacingItemId || uid(),
      type: "skill_builder_lab",
      title: lab.title,
      reference_id: lab.id,
      duration: lab.duration,
      difficulty: lab.difficulty
    };
    const updatedModules = modules.map(m => {
      if (m.id === moduleId) {
        if (replacingItemId) {
          return { ...m, items: m.items.map(i => i.id === replacingItemId ? newItem : i) };
        } else {
          return { ...m, items: [...m.items, newItem] };
        }
      }
      return m;
    });
    setModules(updatedModules);
    setSkillBuilderLabModalOpen(false);
    setCurrentModuleForLab(null);
    setReplacingItemId(null);
    if (replacingItemId) {
      setSelectedLessonId(newItem.id);
    }
  };

  const deleteItem = async (moduleId, itemId) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module || module.items.length <= 1) return;
    const item = module.items.find(i => i.id === itemId);
    const label = item?.title?.trim() || (item?.type === "lesson" ? "this lesson" : "this item");
    if (!(await confirmDelete(`"${label}"`))) return;
    const newItems = module.items.filter(i => i.id !== itemId);
    const updatedModules = modules.map(m => m.id === moduleId ? { ...m, items: newItems } : m);
    setModules(updatedModules);
    if (selectedLessonId === itemId) {
      setSelectedLessonId(newItems[0].id);
    }
  };

  const updateItem = (moduleId, itemId, updates) => {
    const updatedModules = modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          items: m.items.map(i => i.id === itemId ? { ...i, ...updates } : i)
        };
      }
      return m;
    });
    setModules(updatedModules);
  };

  const openEditBlock = (id) => {
    setDraftBlock(null);
    setDialogBlockId(id);
    setBlockDialogOpen(true);
  };

  const startNewBlock = (type) => {
    if (!currentItem || currentItem.type !== "lesson") return;
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
    if (draftBlock && currentItem?.type === "lesson") {
      updateItem(selectedModuleId, currentItem.id, { blocks: [...currentItem.blocks, draftBlock] });
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
    if (!currentItem || currentItem.type !== "lesson") return;
    updateItem(selectedModuleId, currentItem.id, { blocks: currentItem.blocks.filter(b => b.id !== id) });
    if (dialogBlockId === id) {
      setDialogBlockId(null);
      setDraftBlock(null);
    }
  };
  const updateBlock = (id, updates) => { if (!currentItem || currentItem.type !== 'lesson') return; updateItem(selectedModuleId, currentItem.id, { blocks: currentItem.blocks.map(b => b.id === id ? { ...b, ...updates } : b) }); };

  const prepareCourseData = () => {
    return {
      title: lab.title,
      shortDescription: lab.shortDescription,
      fullDescription: lab.fullDescription,
      description: lab.fullDescription,
      thumbnail: lab.thumbnail,
      level: lab.difficulty?.toLowerCase() || "beginner",
      duration_minutes: parseInt(lab.duration) || 0,
      is_free: lab.isFree,
      price: lab.price,
      technologies: lab.technologies,
      requirements: lab.requirements,
      learningOutcomes: lab.learningOutcomes,
      objectives: lab.objectives,
      category_id: lab.categoryId,
      metadata: {
        modules: modules.map(m => ({
          id: m.id,
          title: m.title,
          expanded: m.expanded,
          items: m.items.map(i => {
            if (i.type === 'lesson') {
              return {
                id: i.id,
                type: i.type,
                title: i.title,
                blocks: i.blocks
              };
            } else {
              return {
                id: i.id,
                type: i.type,
                title: i.title,
                reference_id: i.reference_id,
                duration: i.duration,
                difficulty: i.difficulty
              };
            }
          })
        })),
        hasCertificate: lab.hasCertificate,
        certificateName: lab.certificateName,
        hasDiscount: lab.hasDiscount,
        discountPercentage: lab.discountPercentage,
        discountStartDate: lab.discountStartDate,
        discountEndDate: lab.discountEndDate
      }
    };
  };

  const saveCourse = async ({ status: saveStatus } = {}) => {
    const status = saveStatus || publishStatus || "draft";
    const publish = status === "published";
    const submitForReview = status === "draft";

    const errors = [];
    if (!lab.title.trim()) errors.push("Course title is required");
    if (modules.length === 0) errors.push("At least 1 module is required");
    const totalItems = modules.reduce((acc, m) => acc + m.items.length, 0);
    if (totalItems === 0) errors.push("At least 1 item is required");

    setValidationErrors(errors);
    if (errors.length > 0) return;

    try {
      const settings = {
        isPublished: publish,
        submitForReview,
        allowPreview: true,
        requirePrerequisites: false,
        privateAccess: false,
        requireSequential: false,
        showProgress: true,
        pricingModel: lab.isFree ? "free" : "paid",
        completionMessage: "",
        certificate: lab.hasCertificate ? {
          enabled: true,
          available: true,
          title: lab.certificateName,
          name: lab.certificateName,
          certificationId: lab.certificationId || null,
          type: "completion",
          minProgress: 80,
        } : null,
      };

      if (editCourseId) {
        await updateCourseFullWithModules({
          courseId: editCourseId,
          course: lab,
          modules,
          settings,
          dispatch,
        });
        clearEditorDraft(courseDraftKey);
        setTimeout(() => {
          dispatch(hide());
          navigate("/app/courses/mine");
        }, 1500);
        return;
      }

      const result = await createCourseFullWithModules({
        course: lab,
        modules,
        settings,
        dispatch,
      });
      console.log(publish ? "Course published:" : "Course submitted:", result);
      clearEditorDraft(courseDraftKey);

      setTimeout(() => {
        dispatch(hide());
        navigate("/app/courses/mine");
      }, 2000);
    } catch (error) {
      if (isUploadAbortError(error)) {
        showUploadOutcomeError(error);
        return;
      }
      console.error("Error saving course:", error);
      const serverMsg = error?.response?.data?.message;
      setValidationErrors([
        serverMsg || error?.message || "Failed to save course. Please try again.",
      ]);
    }
  };

  const handleSaveCourse = () => saveCourse({ status: publishStatus });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id && currentItem && currentItem.type === 'lesson') {
      const oldIndex = currentItem.blocks.findIndex(b => b.id === active.id);
      const newIndex = currentItem.blocks.findIndex(b => b.id === over.id);
      updateItem(selectedModuleId, currentItem.id, { blocks: arrayMove(currentItem.blocks, oldIndex, newIndex) });
    }
    setDraggedId(null);
  };

  if (loadingCourse) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
        <p className="text-slate-600">Loading course for edit…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => activeStep > 1 ? setActiveStep(activeStep - 1) : navigate("/app/courses/mine")}><ArrowLeft className="w-4 h-4 mr-2" />{activeStep > 1 ? "Previous" : "Back to Courses"}</Button>
            <div className="h-6 w-px bg-slate-300" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {lab.title || (editCourseId ? "Edit Course" : "New Course")}
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
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Short Description</label>
                    <TipTapRichEditor
                      editorKey={editCourseId || editSlug || "new-course"}
                      value={lab.shortDescription || ""}
                      onChange={(html) => updateLab("shortDescription", html)}
                      placeholder="Brief course description…"
                      minHeight={160}
                      maxHeight={320}
                    />
                  </div>
                  <OverviewMediaUploadSection
                    entityLabel="Lab"
                    value={{
                      thumbnail: lab.thumbnail,
                      _thumbnailFile: lab._thumbnailFile,
                      introVideoUrl: lab.introVideoUrl,
                      _introVideoFile: lab._introVideoFile,
                    }}
                    onChange={(media) => setLab((prev) => ({ ...prev, ...media }))}
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Description</label>
                    <Textarea value={lab.fullDescription} onChange={e => updateLab("fullDescription", e.target.value)} rows={4} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                      <Select value={lab.difficulty} onValueChange={v => updateLab("difficulty", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Duration</label>
                      <Input value={lab.duration} onChange={e => updateLab("duration", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                      {categoriesLoading ? (
                        <Select disabled><SelectTrigger><SelectValue placeholder="Loading categories..." /></SelectTrigger></Select>
                      ) : (
                        <Select value={lab.categoryId || ""} onValueChange={v => updateLab("categoryId", v)}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {dynamicCategories.map(cat => (
                              <SelectItem key={cat.id || cat._id} value={String(cat.id || cat._id)}>
                                {cat.name || cat.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
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

            <Card>
              <CardHeader><CardTitle>Certificate & Discount</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Include Certificate</p>
                    <p className="text-xs text-muted-foreground">Students get a certificate upon completion</p>
                  </div>
                  <Switch checked={lab.hasCertificate} onCheckedChange={v => updateLab("hasCertificate", v)} />
                </div>
                <LabCertificateConfigFields
                  enabled={lab.hasCertificate}
                  certificationId={lab.certificationId}
                  certificateTitle={lab.certificateName}
                  onCertificationIdChange={(id) => updateLab("certificationId", id)}
                  onCertificateTitleChange={(title) => updateLab("certificateName", title)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div><p className="text-sm font-medium">Enable Discount</p><p className="text-xs text-muted-foreground">Offer a special discount price</p></div>
                    <Switch checked={lab.hasDiscount} onCheckedChange={v => updateLab("hasDiscount", v)} />
                  </div>
                  {lab.hasDiscount && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Discount Percentage (%)</label>
                        <Input type="number" value={lab.discountPercentage} onChange={e => updateLab("discountPercentage", Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                        <Input type="date" value={lab.discountStartDate} onChange={e => updateLab("discountStartDate", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                        <Input type="date" value={lab.discountEndDate} onChange={e => updateLab("discountEndDate", e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
            {/* Left Sidebar - Course Structure */}
            <div className="col-span-1 lg:col-span-3 min-w-0">
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <CardTitle className="truncate">Course Structure</CardTitle>
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={addModule}><Plus className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 min-w-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="p-3 space-y-3 min-w-0">
                      {modules.map((mod, mIdx) => (
                        <div key={mod.id} className="space-y-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">{mIdx + 1}</div>
                            <Input
                              value={mod.title}
                              onChange={e => updateModule(mod.id, { title: e.target.value })}
                              className="flex-1 min-w-0 font-medium text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => updateModule(mod.id, { expanded: !mod.expanded })}
                            >
                              {mod.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            {modules.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-red-500"
                                onClick={() => deleteModule(mod.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {mod.expanded && (
                            <div className="pl-11 space-y-2 min-w-0 overflow-hidden">
                              <div className="grid grid-cols-1 gap-1 mb-2 w-full min-w-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addLessonToModule(mod.id)}
                                  className="h-8 text-xs w-full justify-start"
                                >
                                  <BookOpen className="w-3.5 h-3.5 mr-1 shrink-0" />
                                  Lesson
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentModuleForLab(mod.id);
                                    setNormalLabModalOpen(true);
                                  }}
                                  className="h-8 text-xs w-full justify-start"
                                >
                                  <FlaskConical className="w-3.5 h-3.5 mr-1 shrink-0" />
                                  Labs
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentModuleForLab(mod.id);
                                    setSkillBuilderLabModalOpen(true);
                                  }}
                                  className="h-8 text-xs w-full justify-start"
                                >
                                  <Zap className="w-3.5 h-3.5 mr-1 shrink-0" />
                                  Skill Builder
                                </Button>
                              </div>
                              {mod.items.map((item, lIdx) => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "group w-full min-w-0 flex items-center gap-1 p-2 rounded-lg transition-all overflow-hidden",
                                    selectedLessonId === item.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedModuleId(mod.id); setSelectedLessonId(item.id); }}
                                    className="flex flex-1 items-center gap-2 text-left min-w-0 overflow-hidden"
                                  >
                                    {item.type === 'lesson' && (
                                      <BookOpen className={cn("w-4 h-4 shrink-0", selectedLessonId === item.id ? "text-blue-600" : "text-slate-400")} />
                                    )}
                                    {item.type === 'normal_lab' && (
                                      <FlaskConical className={cn("w-4 h-4 shrink-0", selectedLessonId === item.id ? "text-orange-600" : "text-slate-400")} />
                                    )}
                                    {item.type === 'skill_builder_lab' && (
                                      <Zap className={cn("w-4 h-4 shrink-0", selectedLessonId === item.id ? "text-purple-600" : "text-slate-400")} />
                                    )}
                                    <span className="flex-1 min-w-0">
                                      <span className="block text-sm text-slate-900 truncate">{lIdx + 1}. {item.title}</span>
                                      <span className="block text-xs text-slate-400">
                                        {item.type === 'lesson' ? `${item.blocks.length} content blocks` : item.type === 'normal_lab' ? 'Normal Lab' : 'Skill Builder Lab'}
                                      </span>
                                    </span>
                                  </button>
                                  {mod.items.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Delete"
                                      className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={(e) => { e.stopPropagation(); deleteItem(mod.id, item.id); }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Center Area - Content Canvas */}
            <div className="col-span-1 lg:col-span-9">
              {currentModule && currentItem ? (
                currentItem.type === 'lesson' ? (
                  <Card className="h-full">
                    <CardHeader className="pb-4 border-b border-slate-100">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl">{currentItem.title}</CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                              {currentItem.blocks.length} {currentItem.blocks.length === 1 ? "content block" : "content blocks"}
                            </p>
                          </div>
                        </div>
                        <Input
                          value={currentItem.title}
                          onChange={e => updateItem(selectedModuleId, currentItem.id, { title: e.target.value })}
                          className="text-base"
                          placeholder="Lesson title"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <Button
                          onClick={() => setBlockTypeSelectorOpen(true)}
                          className="w-full bg-black text-white hover:bg-neutral-800"
                        >
                          <Plus className="w-4 h-4 mr-2" />Add Content Block
                        </Button>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={currentItem.blocks.map(b => b.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {currentItem.blocks.map(block => (
                                <SortableItem key={block.id} id={block.id}>
                                  <BlockCard
                                    block={block}
                                    onDelete={() => deleteBlock(block.id)}
                                    onEdit={() => openEditBlock(block.id)}
                                    onOpenDialog={() => openEditBlock(block.id)}
                                  />
                                </SortableItem>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full">
                    <CardHeader className="pb-4 border-b border-slate-100">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {currentItem.type === 'normal_lab' && (
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <FlaskConical className="w-6 h-6 text-orange-600" />
                              </div>
                            )}
                            {currentItem.type === 'skill_builder_lab' && (
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Zap className="w-6 h-6 text-purple-600" />
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-xl">{currentItem.title}</CardTitle>
                              <p className="text-sm text-slate-500 mt-1">
                                Type: {currentItem.type === 'normal_lab' ? 'Normal Learning Lab' : 'Skill Builder Lab'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <Card className="border-slate-200">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                {currentItem.duration && (
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Duration</label>
                                    <div className="text-slate-600">{currentItem.duration} mins</div>
                                  </div>
                                )}
                                {currentItem.difficulty && (
                                  <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                                    <Badge variant="secondary">{currentItem.difficulty}</Badge>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <Button variant="secondary">
                                  <Eye className="w-4 h-4 mr-2" />Open Preview
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setCurrentModuleForLab(selectedModuleId);
                                    setReplacingItemId(currentItem.id);
                                    if (currentItem.type === 'normal_lab') {
                                      setNormalLabModalOpen(true);
                                    } else {
                                      setSkillBuilderLabModalOpen(true);
                                    }
                                  }}
                                >
                                  <FlaskConical className="w-4 h-4 mr-2" />Replace Lab
                                </Button>
                                <Button
                                  variant="secondary"
                                  className="text-red-600"
                                  onClick={() => deleteItem(selectedModuleId, currentItem.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />Remove
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardContent className="text-center py-20 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-base">Select an item from the sidebar</p>
                    <p className="text-sm mt-2">to start adding content</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <CourseOverviewPreviewPanel
            lab={lab}
            modules={modules}
            expandedPreviewModules={expandedPreviewModules}
            setExpandedPreviewModules={setExpandedPreviewModules}
            expandedPreviewLessons={expandedPreviewLessons}
            setExpandedPreviewLessons={setExpandedPreviewLessons}
            blockTypes={BLOCK_TYPES}
          />
        )}

        {activeStep === 4 && (
          <div className="max-w-6xl mx-auto space-y-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <h2 className="text-lg font-bold text-green-800">Preview & Publish</h2>
                    <p className="text-sm text-green-700">Review how learners will see your course, then publish or submit for approval.</p>
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
                <p className="text-sm text-slate-500 mb-4">This is how other people will see your course before enrolling.</p>
                <CourseOverviewPreviewPanel
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
                <CourseDetailProgressPreviewPanel
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
                <Button onClick={() => setActiveStep(4)}>
                  Next<ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : activeStep === 4 ? (
              <>
                <Button variant="secondary" onClick={() => setActiveStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />Previous
                </Button>
                <div className="text-sm text-slate-500">Step {activeStep} of {STEPS.length}</div>
                <div className="flex items-center gap-3">
                  <Select value={publishStatus} onValueChange={setPublishStatus}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Course status" />
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
                    onClick={handleSaveCourse}
                  >
                    {publishStatus === "published" ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />Publish Course
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />Save as Draft
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
                <Button onClick={() => setActiveStep(activeStep + 1)} disabled={activeStep >= STEPS.length}>
                  Next<ArrowRight className="w-4 h-4 ml-2" />
                </Button>
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

        {/* Normal Lab Selection Modal */}
        <Dialog
          open={normalLabModalOpen}
          onOpenChange={(open) => {
            console.log("Normal Lab Modal open change:", open);
            if (open) {
              setNormalLabSearch("");
              setNormalLabPage(1);
            }
            setNormalLabModalOpen(open);
            if (!open) {
              setCurrentModuleForLab(null);
              setReplacingItemId(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Select Existing Normal Lab</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <Input
                placeholder="Search labs..."
                value={normalLabSearch}
                onChange={(e) => {
                  setNormalLabSearch(e.target.value);
                  setNormalLabPage(1);
                }}
                className="w-full"
              />
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {labsLoading ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  Loading labs...
                </div>
              ) : (
                filteredNormalLabs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    {normalLabSearch ? "No labs found for your search" : "No normal labs available"}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4">
                      {paginatedNormalLabs.map(lab => (
                        <Card
                          key={lab.id}
                          className="cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200 hover:border-blue-300"
                          onClick={() => {
                            console.log("Normal Lab selected:", lab);
                            if (currentModuleForLab) {
                              attachNormalLabToModule(currentModuleForLab, lab);
                            }
                          }}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 p-3 bg-orange-50 rounded-xl">
                                <FlaskConical className="w-8 h-8 text-orange-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-lg text-slate-900 truncate">{lab.title}</h4>
                                <div className="flex items-center gap-3 mt-2">
                                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                                    {lab.difficulty}
                                  </Badge>
                                  <span className="text-sm text-slate-500 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {lab.duration} mins
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="w-6 h-6 text-slate-300 flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {hasMoreNormalLabs && (
                      <div className="text-center pt-4">
                        <Button
                          variant="secondary"
                          onClick={() => setNormalLabPage(prev => prev + 1)}
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => {
                  console.log("Normal Lab Modal cancel clicked");
                  setNormalLabModalOpen(false);
                  setCurrentModuleForLab(null);
                  setReplacingItemId(null);
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Skill Builder Lab Selection Modal */}
        <Dialog
          open={skillBuilderLabModalOpen}
          onOpenChange={(open) => {
            console.log("Skill Builder Lab Modal open change:", open);
            if (open) {
              setSkillBuilderLabSearch("");
              setSkillBuilderLabPage(1);
            }
            setSkillBuilderLabModalOpen(open);
            if (!open) {
              setCurrentModuleForLab(null);
              setReplacingItemId(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Select Existing Skill Builder Lab</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <Input
                placeholder="Search labs..."
                value={skillBuilderLabSearch}
                onChange={(e) => {
                  setSkillBuilderLabSearch(e.target.value);
                  setSkillBuilderLabPage(1);
                }}
                className="w-full"
              />
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {labsLoading ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  Loading labs...
                </div>
              ) : (
                filteredSkillBuilderLabs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    {skillBuilderLabSearch ? "No labs found for your search" : "No skill builder labs available"}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4">
                      {paginatedSkillBuilderLabs.map(lab => (
                        <Card
                          key={lab.id}
                          className="cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200 hover:border-purple-300"
                          onClick={() => {
                            console.log("Skill Builder Lab selected:", lab);
                            if (currentModuleForLab) {
                              attachSkillBuilderLabToModule(currentModuleForLab, lab);
                            }
                          }}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 p-3 bg-purple-50 rounded-xl">
                                <Zap className="w-8 h-8 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-lg text-slate-900 truncate">{lab.title}</h4>
                                <div className="flex items-center gap-3 mt-2">
                                  <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {lab.difficulty}
                                  </Badge>
                                  <span className="text-sm text-slate-500 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {lab.duration} mins
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="w-6 h-6 text-slate-300 flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {hasMoreSkillBuilderLabs && (
                      <div className="text-center pt-4">
                        <Button
                          variant="secondary"
                          onClick={() => setSkillBuilderLabPage(prev => prev + 1)}
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => {
                  console.log("Skill Builder Lab Modal cancel clicked");
                  setSkillBuilderLabModalOpen(false);
                  setCurrentModuleForLab(null);
                  setReplacingItemId(null);
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

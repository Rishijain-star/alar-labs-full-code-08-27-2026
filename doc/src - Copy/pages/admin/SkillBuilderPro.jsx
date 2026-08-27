import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Folder,
  Lightbulb,
  Lock,
  Award
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
import axiosInstance from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast-utils";
import { setLastCreated } from "@/store/slices/labSlice";
import { createFullWithModules } from "@/lib/uploadWithProgress";
import OverviewMediaUploadSection from "@/components/admin/OverviewMediaUploadSection";
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
  { id: 2, label: "Modules", icon: Layers, description: "Organize your content" },
  { id: 3, label: "Lessons", icon: BookOpen, description: "Add lessons to modules" },
  { id: 4, label: "Preview & Publish", icon: Eye, description: "Review and publish your lab" }
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
      return { ...base, content: "" };
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

function RichTextBlockEditor({ block, onChange }) {
  const update = (updates) => onChange({ ...block, ...updates });
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = block.content || "";
    }
  }, [block.id]);

  const handleInput = () => {
    if (editorRef.current) {
      update({ content: editorRef.current.innerHTML });
    }
  };

  const execCommand = (command, value = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      handleInput();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
        <FileText className="w-5 h-5 text-slate-600" />
        <h3 className="font-bold text-slate-900">Rich Text Block</h3>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Text Editor</label>
        <div className="border border-slate-300 rounded-lg p-3 mb-2 flex flex-wrap gap-1 bg-slate-50">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-bold"
            onClick={() => execCommand('bold')}
          >B</Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 italic"
            onClick={() => execCommand('italic')}
          >I</Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 underline"
            onClick={() => execCommand('underline')}
          >U</Button>
          <Separator orientation="vertical" className="h-8 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-bold text-lg"
            onClick={() => execCommand('formatBlock', 'h1')}
          >H1</Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-bold text-base"
            onClick={() => execCommand('formatBlock', 'h2')}
          >H2</Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-semibold text-sm"
            onClick={() => execCommand('formatBlock', 'h3')}
          >H3</Button>
          <Separator orientation="vertical" className="h-8 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => execCommand('insertUnorderedList')}
          >• List</Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => execCommand('insertOrderedList')}
          >1. List</Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-mono"
            onClick={() => execCommand('formatBlock', 'pre')}
          >{`<Code/>`}</Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              const url = prompt("Enter image URL:");
              if (url) execCommand('insertImage', url);
            }}
          ><ImageIcon className="w-3.5 h-3.5" /></Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              const url = prompt("Enter link URL:");
              if (url) execCommand('createLink', url);
            }}
          >Link</Button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="border border-slate-300 rounded-lg p-4 min-h-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
function BlockCard({ block, isSelected, onSelect, onDelete, onDuplicate, onOpenDialog }) {
  const type = BLOCK_TYPES.find(t => t.id === block.type);
  const Icon = type?.icon || FileText;

  return (
    <Card className={cn("mb-3 cursor-pointer transition-all group", isSelected ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm border-slate-200")} onClick={() => onOpenDialog(block.id)}>
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
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }}><Copy className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}><Trash2 className="w-4 h-4" /></Button>
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
    createdBy: "ALAR Labs"
  });

  const [modules, setModules] = useState([
    createEmptyModule()
  ]);

  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id);
  const [selectedLessonId, setSelectedLessonId] = useState(modules[0]?.lessons[0]?.id);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [activeTab, setActiveTab] = useState("structure");
  const [draggedId, setDraggedId] = useState(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [dialogBlockId, setDialogBlockId] = useState(null);
  const [blockTypeSelectorOpen, setBlockTypeSelectorOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [expandedPreviewModules, setExpandedPreviewModules] = useState([]);
  const [expandedPreviewLessons, setExpandedPreviewLessons] = useState([]);

  const currentModule = useMemo(() => modules.find(m => m.id === selectedModuleId), [modules, selectedModuleId]);
  const currentLesson = useMemo(() => currentModule?.lessons.find(l => l.id === selectedLessonId), [currentModule, selectedLessonId]);
  const selectedBlock = useMemo(() => currentLesson?.blocks.find(b => b.id === selectedBlockId), [currentLesson, selectedBlockId]);
  const BlockEditor = selectedBlock ? BLOCK_EDITORS[selectedBlock.type] : null;

  // Sensors for DnD
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Handlers
  const updateLab = (field, value) => setLab({ ...lab, [field]: value });
  const addModule = () => setModules([...modules, createEmptyModule()]);
  const deleteModule = (id) => { if (modules.length <= 1) return; const newMods = modules.filter(m => m.id !== id); setModules(newMods); if (selectedModuleId === id) { setSelectedModuleId(newMods[0].id); setSelectedLessonId(newMods[0].lessons[0].id); } };
  const updateModule = (id, updates) => setModules(modules.map(m => m.id === id ? { ...m, ...updates } : m));

  const addLesson = () => { if (!currentModule) return; const newLesson = createEmptyLesson(); updateModule(currentModule.id, { lessons: [...currentModule.lessons, newLesson] }); setSelectedLessonId(newLesson.id); };
  const deleteLesson = (id) => { if (!currentModule || currentModule.lessons.length <= 1) return; const newLessons = currentModule.lessons.filter(l => l.id !== id); updateModule(currentModule.id, { lessons: newLessons }); if (selectedLessonId === id) setSelectedLessonId(newLessons[0].id); };
  const updateLesson = (id, updates) => { if (!currentModule) return; updateModule(currentModule.id, { lessons: currentModule.lessons.map(l => l.id === id ? { ...l, ...updates } : l) }); };

  const addBlock = (type) => {
    if (!currentLesson) return;
    const newBlock = createEmptyBlock(type);
    updateLesson(currentLesson.id, { blocks: [...currentLesson.blocks, newBlock] });
    setDialogBlockId(newBlock.id);
    setBlockDialogOpen(true);
  };
  const duplicateBlock = (id) => {
    if (!currentLesson) return;
    const blockToDuplicate = currentLesson.blocks.find(b => b.id === id);
    if (!blockToDuplicate) return;
    const newBlock = { ...blockToDuplicate, id: crypto.randomUUID() };
    updateLesson(currentLesson.id, { blocks: [...currentLesson.blocks, newBlock] });
    setDialogBlockId(newBlock.id);
    setBlockDialogOpen(true);
  };
  const deleteBlock = (id) => { if (!currentLesson) return; updateLesson(currentLesson.id, { blocks: currentLesson.blocks.filter(b => b.id !== id) }); if (selectedBlockId === id) setSelectedBlockId(null); };
  const updateBlock = (id, updates) => { if (!currentLesson) return; updateLesson(currentLesson.id, { blocks: currentLesson.blocks.map(b => b.id === id ? { ...b, ...updates } : b) }); };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch();

  const validateAndPublish = async () => {
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

        const result = await createFullWithModules({
          lab: lab,
          modules: modules,
          dispatch
        });

        if (result?.success || result?.data?.lab) {
          const labData = result.data?.lab || result;
          dispatch(setLastCreated({ id: labData.id, title: labData.title }));
          showSuccess("Lab created successfully!");
          navigate("/app/labs");
        } else {
          showError(result?.message || "Failed to create lab");
        }
      } catch (error) {
        console.error("Error creating lab:", error);
        showError(error?.response?.data?.message || error?.message || "Failed to create lab");
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
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => activeStep > 1 ? setActiveStep(activeStep - 1) : navigate("/app/labs")}><ArrowLeft className="w-4 h-4 mr-2" />{activeStep > 1 ? "Previous" : "Back to Labs"}</Button>
            <div className="h-6 w-px bg-slate-300" />
            <h1 className="text-xl font-bold text-slate-900">{lab.title || "New Skill Builder Lab"}</h1>
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
                    <Textarea value={lab.shortDescription} onChange={e => updateLab("shortDescription", e.target.value)} rows={2} />
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
                    <Select value={lab.platform || "AWS"} onValueChange={(v) => updateLab("platform", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Linux", "Other"].map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Description</label>
                    <Textarea value={lab.fullDescription} onChange={e => updateLab("fullDescription", e.target.value)} rows={4} />
                  </div>
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
                  {!lab.isFree && <div><label className="block text-sm font-semibold text-slate-700 mb-1">Price ($)</label><Input type="number" value={lab.price} onChange={e => updateLab("price", Number(e.target.value))} /></div>}
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
                {lab.certificateEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Certificate Title</label>
                      <Input
                        value={lab.certificateTitle}
                        onChange={(e) => updateLab("certificateTitle", e.target.value)}
                        placeholder="e.g. AWS Cloud Fundamentals Completion Certificate"
                        className="bg-muted/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Certificate Type</label>
                      <Select value={lab.certificateType} onValueChange={(v) => updateLab("certificateType", v)}>
                        <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select certificate type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completion">Completion Certificate</SelectItem>
                          <SelectItem value="excellence">Excellence Certificate</SelectItem>
                          <SelectItem value="participation">Participation Certificate</SelectItem>
                          <SelectItem value="skill">Skill Verification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Minimum Progress Required (%)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={lab.certificateMinProgress}
                        onChange={(e) => updateLab("certificateMinProgress", Number(e.target.value))}
                        className="bg-muted/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Certificate Thumbnail / Badge URL</label>
                      <Input
                        value={lab.certificateThumbnail}
                        onChange={(e) => updateLab("certificateThumbnail", e.target.value)}
                        placeholder="https://..."
                        className="bg-muted/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Certificate Description</label>
                      <Textarea
                        value={lab.certificateDescription}
                        onChange={(e) => updateLab("certificateDescription", e.target.value)}
                        placeholder="Students will receive an industry-recognized completion certificate after successfully finishing the course."
                        rows={3}
                        className="bg-muted/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Verification Text</label>
                      <Textarea
                        value={lab.certificateVerificationText}
                        onChange={(e) => updateLab("certificateVerificationText", e.target.value)}
                        placeholder="Issued and verified by ALAR Labs Learning & Innovation."
                        rows={2}
                        className="bg-muted/30"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <div>
                          <p className="text-sm font-medium">Require Quiz Passing</p>
                        </div>
                        <Switch checked={!!lab.certificateRequireQuiz} onCheckedChange={v => updateLab("certificateRequireQuiz", v)} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <div>
                          <p className="text-sm font-medium">Require All Tasks Completion</p>
                        </div>
                        <Switch checked={!!lab.certificateRequireTasks} onCheckedChange={v => updateLab("certificateRequireTasks", v)} />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeStep === 2 && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Modules</h2>
              <Button onClick={addModule}><Plus className="w-4 h-4 mr-2" />Add Module</Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
              const { active, over } = e; if (active.id !== over.id) {
                const oldIdx = modules.findIndex(m => m.id === active.id);
                const newIdx = modules.findIndex(m => m.id === over.id);
                setModules(arrayMove(modules, oldIdx, newIdx));
              }
            }}>
              <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {modules.map((module, idx) => (
                    <SortableItem key={module.id} id={module.id}>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <GripVertical className="w-5 h-5 text-slate-400 mt-1 cursor-grab" />
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">{idx + 1}</div>
                                <Input value={module.title} onChange={e => updateModule(module.id, { title: e.target.value })} className="font-medium" />
                                <Button variant="ghost" size="icon" onClick={() => updateModule(module.id, { expanded: !module.expanded })}>
                                  {module.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                                {modules.length > 1 && <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteModule(module.id)}><Trash2 className="w-4 h-4" /></Button>}
                              </div>
                              {module.expanded && (
                                <div className="pl-11 pt-2">
                                  <div className="text-sm text-slate-500 mb-2">{module.lessons.length} lessons</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {activeStep === 3 && (
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
                                <button
                                  key={les.id}
                                  onClick={() => { setSelectedModuleId(mod.id); setSelectedLessonId(les.id); }}
                                  className={cn(
                                    "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all",
                                    selectedLessonId === les.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                                  )}
                                >
                                  <FileText className={cn("w-4 h-4", selectedLessonId === les.id ? "text-blue-600" : "text-slate-400")} />
                                  <div className="flex-1">
                                    <div className="text-sm text-slate-900">{lIdx + 1}. {les.title}</div>
                                    <div className="text-xs text-slate-400">{les.blocks.length} content blocks</div>
                                  </div>
                                </button>
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
            <div className="col-span-1 lg:col-span-6">
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
                            className={cn(
                              "cursor-pointer transition-all group",
                              selectedBlockId === block.id ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm border-slate-200"
                            )}
                            onClick={() => setSelectedBlockId(block.id)}
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
                                    onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                                  >
                                    <Copy className="w-4 h-4" />
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
                        variant="secondary"
                        className="w-full py-6 border-dashed border-2 bg-slate-50 hover:bg-slate-100"
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

            {/* Right Sidebar - Block Settings */}
            <div className="col-span-1 lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    {selectedBlock ? "Block Settings" : "Settings"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[65vh] overflow-y-auto">
                  {selectedBlock && BlockEditor ? (
                    <BlockEditor
                      block={selectedBlock}
                      onChange={updates => updateBlock(selectedBlock.id, updates)}
                    />
                  ) : (
                    <div className="text-center py-16 text-slate-400">
                      <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Select a content block</p>
                      <p className="text-xs mt-1">to edit its settings</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Compact Lab Header */}
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
                      {lab.difficulty && (
                        <Badge variant="outline" className="text-xs">{lab.difficulty}</Badge>
                      )}
                      {lab.isFree ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">Free</Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs">Paid - ${lab.price}</Badge>
                      )}
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-1">{lab.title || "Untitled Lab"}</h1>
                    <p className="text-sm text-slate-600 mb-3">{lab.shortDescription || "No description provided"}</p>

                    {/* Compact Stats */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(i => (
                            <span key={i} className={i <= Math.round(lab.rating) ? "text-yellow-400" : "text-slate-300"}>⭐</span>
                          ))}
                        </div>
                        <span className="text-sm text-slate-600">{lab.rating} ({lab.studentCount.toLocaleString()})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Layers className="w-4 h-4" />
                        <span className="text-sm">{modules.length} {modules.length === 1 ? 'Module' : 'Modules'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-sm">{modules.reduce((acc, m) => acc + m.lessons.length, 0)} {modules.reduce((acc, m) => acc + m.lessons.length, 0) === 1 ? 'Lesson' : 'Lessons'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Layout className="w-4 h-4" />
                        <span className="text-sm">{modules.reduce((acc, m) => acc + m.lessons.reduce((a, l) => a + l.blocks.length, 0), 0)} Tasks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column - Learning Details */}
              <div className="lg:col-span-4 space-y-4">
                {/* Technologies */}
                {lab.technologies.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Technologies</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1.5">
                        {lab.technologies.map((tech, i) => (
                          <Badge key={i} className="text-xs">{tech}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Requirements */}
                {lab.requirements.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Requirements</CardTitle>
                    </CardHeader>
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

                {/* Learning Outcomes */}
                {lab.learningOutcomes.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">What you'll learn</CardTitle>
                    </CardHeader>
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

                {/* Content Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Content Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {Object.entries(
                        modules.reduce((acc, m) => {
                          m.lessons.forEach(l => {
                            l.blocks.forEach(b => {
                              acc[b.type] = (acc[b.type] || 0) + 1;
                            });
                          });
                          return acc;
                        }, {})
                      ).map(([type, count]) => {
                        const typeConfig = BLOCK_TYPES.find(t => t.id === type);
                        const IconComponent = typeConfig?.icon || FileText;
                        return (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded flex items-center justify-center ${typeConfig?.bg || "bg-slate-100"}`}>
                                <IconComponent className={`w-4 h-4 ${typeConfig?.color || "text-slate-600"}`} />
                              </div>
                              <span className="text-sm text-slate-700">{typeConfig?.label || type}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{count}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* JSON Payload Preview */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">JSON Payload Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <pre className="bg-slate-950 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(
                        {
                          lab: lab,
                          modules: modules
                        },
                        null,
                        2
                      )}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Course Content (Accordion) */}
              <div className="lg:col-span-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Course Content</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {modules.map((mod, mIdx) => {
                      const isExpanded = expandedPreviewModules.includes(mod.id);
                      return (
                        <div key={mod.id} className="border border-slate-200 rounded-lg overflow-hidden">
                          {/* Module Header (clickable) */}
                          <button
                            onClick={() => {
                              setExpandedPreviewModules(
                                isExpanded
                                  ? expandedPreviewModules.filter(id => id !== mod.id)
                                  : [...expandedPreviewModules, mod.id]
                              );
                            }}
                            className="w-full bg-slate-50 px-3 py-2.5 flex items-center justify-between hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">{mIdx + 1}</div>
                              <div className="text-left">
                                <p className="font-semibold text-sm text-slate-900">{mod.title || "Untitled Module"}</p>
                                <p className="text-xs text-slate-500">{mod.lessons.length} {mod.lessons.length === 1 ? 'Lesson' : 'Lessons'}</p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {/* Module Lessons (collapsible) */}
                          {isExpanded && (
                            <div className="bg-white p-2.5 space-y-1.5 border-t border-slate-100">
                              {mod.lessons.map((lesson, lIdx) => {
                                const isLessonExpanded = expandedPreviewLessons.includes(lesson.id);
                                const lessonBlockCounts = lesson.blocks.reduce((acc, b) => {
                                  acc[b.type] = (acc[b.type] || 0) + 1;
                                  return acc;
                                }, {});
                                return (
                                  <div key={lesson.id} className="border border-slate-100 rounded-md overflow-hidden">
                                    {/* Lesson Header (clickable) */}
                                    <button
                                      onClick={() => {
                                        setExpandedPreviewLessons(
                                          isLessonExpanded
                                            ? expandedPreviewLessons.filter(id => id !== lesson.id)
                                            : [...expandedPreviewLessons, lesson.id]
                                        );
                                      }}
                                      className="w-full flex items-center gap-2.5 p-2 hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs ml-10">{lIdx + 1}</div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <p className="font-medium text-sm text-slate-900 truncate">{lesson.title || "Untitled Lesson"}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {Object.entries(lessonBlockCounts).slice(0, 3).map(([type, count]) => {
                                            const typeConfig = BLOCK_TYPES.find(t => t.id === type);
                                            const IconComponent = typeConfig?.icon || FileText;
                                            return (
                                              <span key={type} className="flex items-center gap-1 text-xs text-slate-500">
                                                <IconComponent className={`w-3 h-3 ${typeConfig?.color || "text-slate-500"}`} />
                                                {count}
                                              </span>
                                            );
                                          })}
                                          {Object.keys(lessonBlockCounts).length > 3 && (
                                            <span className="text-xs text-slate-400">+{Object.keys(lessonBlockCounts).length - 3} more</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-400">
                                          {lesson.blocks.length} {lesson.blocks.length === 1 ? 'block' : 'blocks'}
                                        </span>
                                        <ChevronDown
                                          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isLessonExpanded ? 'rotate-180' : ''}`}
                                        />
                                      </div>
                                    </button>

                                    {/* Lesson Blocks (collapsible) */}
                                    {isLessonExpanded && lesson.blocks.length > 0 && (
                                      <div className="bg-slate-50 p-2 ml-12 space-y-1.5 border-t border-slate-100">
                                        {lesson.blocks.map((block, bIdx) => {
                                          const typeConfig = BLOCK_TYPES.find(t => t.id === block.type);
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
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="fixed bottom-24 left-0 right-0 z-50">
            <div className="container mx-auto px-4">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <h3 className="font-bold text-red-800 mb-2">Please fix the following errors:</h3>
                  <ul className="list-disc pl-5 text-red-700">
                    {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40">
          <div className="container mx-auto flex items-center justify-between">
            {activeStep === 4 ? (
              <>
                <Button variant="secondary" onClick={() => setActiveStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />Back
                </Button>
                <div className="text-sm text-slate-500">Step {activeStep} of {STEPS.length}</div>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" disabled={isSubmitting}><Save className="w-4 h-4 mr-2" />Save Draft</Button>
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" onClick={validateAndPublish} disabled={isSubmitting}><Check className="w-4 h-4 mr-2" />{isSubmitting ? "Creating Lab..." : "Publish Lab"}</Button>
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
                      addBlock(type.id);
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
        <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {(() => {
                  const block = dialogBlockId && currentLesson?.blocks.find(b => b.id === dialogBlockId);
                  const type = block ? BLOCK_TYPES.find(t => t.id === block.type) : null;
                  return `${type?.label || "Block"} Configuration`;
                })()}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto">
              {(() => {
                const block = dialogBlockId && currentLesson?.blocks.find(b => b.id === dialogBlockId);
                const BlockEditor = block ? BLOCK_EDITORS[block.type] : null;
                return block && BlockEditor ? (
                  <BlockEditor block={block} onChange={updates => updateBlock(dialogBlockId, updates)} />
                ) : null;
              })()}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setBlockDialogOpen(false)}>Save & Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

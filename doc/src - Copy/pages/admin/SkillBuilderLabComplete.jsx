import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
  Settings,
  Trash2,
  GripVertical,
  Layout,
  Layers
} from "lucide-react";

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
import { cn } from "@/lib/utils";

// Constants
const BLOCK_TYPES = [
  {
    id: "video",
    label: "Video Block",
    icon: Play,
    color: "text-blue-600",
    bg: "bg-blue-50",
    description: "Add a video with description and notes"
  },
  {
    id: "text",
    label: "Text Block",
    icon: FileText,
    color: "text-slate-600",
    bg: "bg-slate-50",
    description: "Add rich text content"
  },
  {
    id: "image",
    label: "Image Block",
    icon: ImageIcon,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    description: "Add images with captions"
  },
  {
    id: "quiz",
    label: "Quiz Block",
    icon: HelpCircle,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    description: "Add interactive multiple choice questions"
  },
  {
    id: "trueFalse",
    label: "True/False Block",
    icon: CheckCircle2,
    color: "text-purple-600",
    bg: "bg-purple-50",
    description: "Add true/false questions"
  },
  {
    id: "code",
    label: "Coding Block",
    icon: Code2,
    color: "text-green-600",
    bg: "bg-green-50",
    description: "Add coding practice examples"
  },
  {
    id: "fillBlank",
    label: "Fill in the Blank",
    icon: FileText,
    color: "text-orange-600",
    bg: "bg-orange-50",
    description: "Add fill in the blank questions"
  }
];

const PLATFORMS = ["AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Linux", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const CODE_LANGS = ["bash", "python", "javascript", "typescript", "yaml", "json", "sql", "dockerfile", "go"];

// Helper for unique IDs
let uidCounter = 0;
const uid = () => `id_${++uidCounter}_${Date.now()}`;

// Empty state templates
const createEmptyBlock = (type) => {
  const base = { id: uid(), type };
  switch (type) {
    case "video":
      return { ...base, title: "", videoUrl: "", description: "", notes: "", duration: "" };
    case "text":
      return { ...base, content: "" };
    case "image":
      return { ...base, title: "", imageUrl: "", caption: "", description: "" };
    case "quiz":
      return { ...base, question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", points: 10 };
    case "trueFalse":
      return { ...base, statement: "", correctAnswer: true, explanation: "" };
    case "code":
      return { ...base, title: "", language: "javascript", code: "", description: "" };
    case "fillBlank":
      return { ...base, question: "", blanks: [{ id: uid(), answer: "", hint: "" }], explanation: "" };
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
  lessons: [createEmptyLesson()]
});

// Block Editors
function VideoBlockEditor({ block, onChange }) {
  const update = (field, value) => onChange({ ...block, [field]: value });
  return (
    <div className="space-y-4 p-4 bg-blue-50/30 rounded-lg border border-blue-100">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-blue-900">Video Block Configuration</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Block Title</label>
        <Input
          value={block.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g., Introduction to the Hero Section"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Video URL</label>
        <Input
          value={block.videoUrl}
          onChange={(e) => update("videoUrl", e.target.value)}
          placeholder="https://example.com/video.mp4"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <Textarea
          value={block.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What this video is about..."
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <Textarea
            value={block.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Additional notes for students..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
          <Input
            value={block.duration}
            onChange={(e) => update("duration", e.target.value)}
            placeholder="5:30"
          />
        </div>
      </div>
    </div>
  );
}

function TextBlockEditor({ block, onChange }) {
  const update = (field, value) => onChange({ ...block, [field]: value });
  return (
    <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-slate-600" />
        <span className="font-semibold text-slate-900">Text Block Configuration</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Rich Text Content</label>
        <Textarea
          value={block.content}
          onChange={(e) => update("content", e.target.value)}
          placeholder="<h2>Welcome!</h2><p>This is a rich text block...</p>"
          rows={8}
        />
      </div>
    </div>
  );
}

function ImageBlockEditor({ block, onChange }) {
  const update = (field, value) => onChange({ ...block, [field]: value });
  return (
    <div className="space-y-4 p-4 bg-indigo-50/30 rounded-lg border border-indigo-100">
      <div className="flex items-center gap-2 mb-2">
        <ImageIcon className="w-5 h-5 text-indigo-600" />
        <span className="font-semibold text-indigo-900">Image Block Configuration</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Image Title</label>
        <Input
          value={block.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g., Hero Section Example"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
        <Input
          value={block.imageUrl}
          onChange={(e) => update("imageUrl", e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Caption</label>
          <Input
            value={block.caption}
            onChange={(e) => update("caption", e.target.value)}
            placeholder="Image caption..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <Input
            value={block.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Description..."
          />
        </div>
      </div>
    </div>
  );
}

function QuizBlockEditor({ block, onChange }) {
  const update = (field, value) => onChange({ ...block, [field]: value });
  const updateOption = (index, value) => {
    const newOptions = [...(block.options || ["", "", "", ""])];
    newOptions[index] = value;
    update("options", newOptions);
  };
  
  return (
    <div className="space-y-4 p-4 bg-yellow-50/30 rounded-lg border border-yellow-100">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-5 h-5 text-yellow-600" />
        <span className="font-semibold text-yellow-900">Quiz Block Configuration</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
        <Textarea
          value={block.question}
          onChange={(e) => update("question", e.target.value)}
          placeholder="What is React?"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Options</label>
        {(block.options || ["", "", "", ""]).map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              block.correctAnswer === i ? "bg-green-500 text-white" : "bg-slate-200 text-slate-600"
            )}>
              {String.fromCharCode(65 + i)}
            </div>
            <Input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                block.correctAnswer === i ? "text-green-600" : "text-slate-400"
              )}
              onClick={() => update("correctAnswer", i)}
            >
              <CheckCircle2 className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
          <Textarea
            value={block.explanation}
            onChange={(e) => update("explanation", e.target.value)}
            placeholder="Why the answer is correct..."
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Points</label>
          <Input
            type="number"
            value={block.points}
            onChange={(e) => update("points", Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

function TrueFalseBlockEditor({ block, onChange }) {
  const update = (field, value) => onChange({ ...block, [field]: value });
  return (
    <div className="space-y-4 p-4 bg-purple-50/30 rounded-lg border border-purple-100">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-purple-900">True/False Block Configuration</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Statement</label>
        <Textarea
          value={block.statement}
          onChange={(e) => update("statement", e.target.value)}
          placeholder="React is a JavaScript library."
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Correct Answer</label>
        <div className="flex gap-4">
          <Button
            variant={block.correctAnswer === true ? "default" : "secondary"}
            onClick={() => update("correctAnswer", true)}
            className="flex-1"
          >
            True
          </Button>
          <Button
            variant={block.correctAnswer === false ? "default" : "secondary"}
            onClick={() => update("correctAnswer", false)}
            className="flex-1"
          >
            False
          </Button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
        <Textarea
          value={block.explanation}
          onChange={(e) => update("explanation", e.target.value)}
          placeholder="Why this is true or false..."
        />
      </div>
    </div>
  );
}

function CodeBlockEditor({ block, onChange }) {
  const update = (field, value) => onChange({ ...block, [field]: value });
  return (
    <div className="space-y-4 p-4 bg-green-50/30 rounded-lg border border-green-100">
      <div className="flex items-center gap-2 mb-2">
        <Code2 className="w-5 h-5 text-green-600" />
        <span className="font-semibold text-green-900">Coding Block Configuration</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Block Title</label>
          <Input
            value={block.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g., Hello World in JavaScript"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
          <Select value={block.language} onValueChange={(v) => update("language", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODE_LANGS.map((lang) => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
        <Textarea
          value={block.code}
          onChange={(e) => update("code", e.target.value)}
          placeholder="// Write your code here"
          className="font-mono text-sm"
          rows={8}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <Textarea
          value={block.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What this code does..."
        />
      </div>
    </div>
  );
}

// Render selected block editor
const BLOCK_EDITORS = {
  video: VideoBlockEditor,
  text: TextBlockEditor,
  image: ImageBlockEditor,
  quiz: QuizBlockEditor,
  trueFalse: TrueFalseBlockEditor,
  code: CodeBlockEditor
};

function BlockCard({ block, isSelected, onSelect, onDelete }) {
  const blockType = BLOCK_TYPES.find((t) => t.id === block.type);
  const Icon = blockType?.icon || FileText;
  
  return (
    <Card
      className={cn(
        "mb-3 cursor-pointer transition-all",
        isSelected ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn("p-2 rounded-lg", blockType?.bg)}>
              <Icon className={cn("w-5 h-5", blockType?.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900">
                {block.title || blockType?.label || "Untitled Block"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {blockType?.label}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SkillBuilderLabComplete() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lab");
  
  // Lab data state
  const [labData, setLabData] = useState({
    title: "React Hero Section Complete Course",
    description: "Master the art of building stunning, responsive hero sections",
    platform: "AWS",
    level: "Beginner",
    category: "Cloud Computing",
    duration: "3 hours",
    credits: "5 Credits",
    timerSec: 10800,
    rating: 4.8,
    isFree: true,
    price: 0,
    enrolledCount: 1234,
    tags: ["React", "CSS", "Frontend"],
    technologies: ["React", "Tailwind CSS"],
    requirements: ["Basic HTML", "Basic CSS"],
    recommendedKnowledge: ["React components"],
    whatYouWillLearn: [
      "Design beautiful hero sections",
      "Responsive grid layouts",
      "Modern CSS animations"
    ],
    learningObjectives: [
      "Create responsive hero layouts",
      "Implement smooth animations"
    ]
  });

  // Modules, Lessons, Blocks state
  const [modules, setModules] = useState([
    {
      id: "mod-001",
      title: "Introduction",
      lessons: [
        {
          id: "les-001",
          title: "What is a Hero Section",
          blocks: [
            {
              id: "block-001",
              type: "video",
              title: "Introduction to Hero Sections",
              videoUrl: "",
              description: "Learn what makes a great hero section",
              notes: "",
              duration: "5:30"
            },
            {
              id: "block-002",
              type: "text",
              content: "<h2>Why Hero Sections Matter</h2><p>The hero section is the first thing users see.</p>"
            }
          ]
        }
      ]
    }
  ]);

  // Current selection
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id);
  const [selectedLessonId, setSelectedLessonId] = useState(modules[0]?.lessons[0]?.id);
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  // Helper to update lab data
  const updateLabData = (field, value) => setLabData({ ...labData, [field]: value });

  // Helper to update modules
  const updateModule = (moduleId, updates) => {
    setModules(modules.map((m) =>
      m.id === moduleId ? { ...m, ...updates } : m
    ));
  };

  const addModule = () => {
    const newMod = createEmptyModule();
    setModules([...modules, newMod]);
    setSelectedModuleId(newMod.id);
    setSelectedLessonId(newMod.lessons[0].id);
  };

  const deleteModule = (moduleId) => {
    if (modules.length <= 1) return;
    const newModules = modules.filter((m) => m.id !== moduleId);
    setModules(newModules);
    if (selectedModuleId === moduleId) {
      setSelectedModuleId(newModules[0].id);
      setSelectedLessonId(newModules[0].lessons[0].id);
    }
  };

  // Helpers for lessons
  const getCurrentModule = useMemo(() =>
    modules.find((m) => m.id === selectedModuleId),
    [modules, selectedModuleId]
  );

  const getCurrentLesson = useMemo(() =>
    getCurrentModule?.lessons.find((l) => l.id === selectedLessonId),
    [getCurrentModule, selectedLessonId]
  );

  const addLesson = () => {
    if (!getCurrentModule) return;
    const newLesson = createEmptyLesson();
    updateModule(selectedModuleId, {
      lessons: [...getCurrentModule.lessons, newLesson]
    });
    setSelectedLessonId(newLesson.id);
  };

  const deleteLesson = (lessonId) => {
    if (!getCurrentModule || getCurrentModule.lessons.length <= 1) return;
    const newLessons = getCurrentModule.lessons.filter((l) => l.id !== lessonId);
    updateModule(selectedModuleId, { lessons: newLessons });
    if (selectedLessonId === lessonId) {
      setSelectedLessonId(newLessons[0].id);
    }
  };

  const updateLesson = (lessonId, updates) => {
    if (!getCurrentModule) return;
    updateModule(selectedModuleId, {
      lessons: getCurrentModule.lessons.map((l) =>
        l.id === lessonId ? { ...l, ...updates } : l
      )
    });
  };

  // Helpers for blocks
  const addBlock = (type) => {
    if (!getCurrentLesson) return;
    const newBlock = createEmptyBlock(type);
    updateLesson(selectedLessonId, {
      blocks: [...getCurrentLesson.blocks, newBlock]
    });
    setSelectedBlockId(newBlock.id);
  };

  const deleteBlock = (blockId) => {
    if (!getCurrentLesson) return;
    updateLesson(selectedLessonId, {
      blocks: getCurrentLesson.blocks.filter((b) => b.id !== blockId)
    });
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const updateBlock = (blockId, updates) => {
    if (!getCurrentLesson) return;
    updateLesson(selectedLessonId, {
      blocks: getCurrentLesson.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      )
    });
  };

  const getSelectedBlock = useMemo(() =>
    getCurrentLesson?.blocks.find((b) => b.id === selectedBlockId),
    [getCurrentLesson, selectedBlockId]
  );

  const BlockEditor = getSelectedBlock ? BLOCK_EDITORS[getSelectedBlock.type] : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/app/labs")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Labs
            </Button>
            <div className="h-6 w-px bg-slate-300" />
            <h1 className="text-xl font-bold text-slate-900">
              Skill Builder Lab Editor
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Lab Structure */}
          <div className="col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Lab Structure</CardTitle>
                  <Button variant="ghost" size="sm" onClick={addModule}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="p-2 space-y-2">
                    {modules.map((module, mIndex) => (
                      <div key={module.id} className="space-y-1">
                        <div className={cn(
                          "flex items-center justify-between p-2 rounded-lg transition-colors",
                          selectedModuleId === module.id ? "bg-blue-50" : "hover:bg-slate-50"
                        )}>
                          <button
                            className="flex items-center gap-2 text-left flex-1"
                            onClick={() => {
                              setSelectedModuleId(module.id);
                              if (module.lessons.length > 0 && !selectedLessonId) {
                                setSelectedLessonId(module.lessons[0].id);
                              }
                            }}
                          >
                            <Layers className="w-4 h-4 text-slate-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900">
                                Module {mIndex + 1}: {module.title}
                              </div>
                              <div className="text-xs text-slate-500">
                                {module.lessons.length} lessons
                              </div>
                            </div>
                          </button>
                          {modules.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500"
                              onClick={() => deleteModule(module.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {selectedModuleId === module.id && (
                          <div className="pl-6 space-y-1 pb-2">
                            {module.lessons.map((lesson, lIndex) => (
                              <div key={lesson.id} className="space-y-1">
                                <div className={cn(
                                  "flex items-center justify-between p-2 rounded-lg transition-colors",
                                  selectedLessonId === lesson.id ? "bg-blue-100" : "hover:bg-slate-50"
                                )}>
                                  <button
                                    className="flex items-center gap-2 text-left flex-1"
                                    onClick={() => setSelectedLessonId(lesson.id)}
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm text-slate-900">
                                        {lIndex + 1}. {lesson.title}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {lesson.blocks.length} blocks
                                      </div>
                                    </div>
                                  </button>
                                  {module.lessons.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500"
                                      onClick={() => deleteLesson(lesson.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-1 text-blue-600"
                              onClick={addLesson}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Lesson
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

          {/* Main Content */}
          <div className="col-span-9">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="lab">Lab Info</TabsTrigger>
                <TabsTrigger value="content">
                  <Layout className="w-4 h-4 mr-2" />
                  Lesson Builder
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lab" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Lab Title</label>
                      <Input
                        value={labData.title}
                        onChange={(e) => updateLabData("title", e.target.value)}
                        className="text-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <Textarea
                        value={labData.description}
                        onChange={(e) => updateLabData("description", e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
                        <Select value={labData.platform} onValueChange={(v) => updateLabData("platform", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PLATFORMS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                        <Select value={labData.level} onValueChange={(v) => updateLabData("level", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                        <Input
                          value={labData.duration}
                          onChange={(e) => updateLabData("duration", e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content">
                {getCurrentModule && getCurrentLesson ? (
                  <div className="grid grid-cols-12 gap-6">
                    {/* Lesson Content - Blocks */}
                    <div className="col-span-7">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>Lesson: {getCurrentLesson.title}</CardTitle>
                              <p className="text-sm text-slate-500 mt-1">
                                Add content blocks to this lesson
                              </p>
                            </div>
                            <Input
                              value={getCurrentLesson.title}
                              onChange={(e) => updateLesson(getCurrentLesson.id, { title: e.target.value })}
                              className="w-64"
                            />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Add Block</h4>
                            <div className="flex flex-wrap gap-2">
                              {BLOCK_TYPES.map((type) => {
                                const Icon = type.icon;
                                return (
                                  <Button
                                    key={type.id}
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => addBlock(type.id)}
                                    className="flex items-center gap-2"
                                  >
                                    <Icon className="w-4 h-4" />
                                    {type.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          <Separator className="mb-6" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                              Blocks in this Lesson ({getCurrentLesson.blocks.length})
                            </h4>
                            {getCurrentLesson.blocks.length === 0 ? (
                              <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No blocks yet. Add your first block above!</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {getCurrentLesson.blocks.map((block) => (
                                  <BlockCard
                                    key={block.id}
                                    block={block}
                                    isSelected={selectedBlockId === block.id}
                                    onSelect={() => setSelectedBlockId(block.id)}
                                    onDelete={deleteBlock}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    {/* Block Configuration */}
                    <div className="col-span-5">
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            {getSelectedBlock ? "Block Configuration" : "Select a Block"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {getSelectedBlock && BlockEditor ? (
                            <BlockEditor
                              block={getSelectedBlock}
                              onChange={(updates) => updateBlock(getSelectedBlock.id, updates)}
                            />
                          ) : (
                            <div className="text-center py-16 text-slate-500">
                              <Layout className="w-10 h-10 mx-auto mb-3 opacity-30" />
                              <p>Select a block from the left to configure it</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Select a module and lesson from the sidebar</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Layers,
  ListTree,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { BlockEditor, BLOCK_META } from "@/components/ui/blockeditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { defaultLabOutline, uid } from "@/lib/labOutlineUtils";

const PALETTE = [
  { kind: "section", label: "Section", desc: "Top-level group", group: "structure" },
  { kind: "task", label: "Task", desc: "Under a section", group: "structure" },
  { kind: "step", label: "Step", desc: "Under a task", group: "structure" },
  { kind: "substep", label: "Sub-step", desc: "Inside a step", group: "structure" },
  { kind: "para", label: "Text", desc: "Rich text (highlight colors)", group: "block" },
  { kind: "code", label: "Code", desc: "Code block", group: "block" },
  { kind: "note_box", label: "Note", desc: "Rich note box (custom color)", group: "block" },
  { kind: "label", label: "Label", desc: "Heading/label text", group: "block" },
  { kind: "list", label: "List", desc: "Bulleted list", group: "block" },
  { kind: "table", label: "Table", desc: "Two-column rows", group: "block" },
  { kind: "banner", label: "Banner", desc: "Info/Warning/Tip banner", group: "block" },
  { kind: "media_image", label: "Image", desc: "Image / screenshot", group: "block" },
  { kind: "media_video", label: "Video", desc: "Video file", group: "block" },
  { kind: "media_youtube", label: "YouTube", desc: "Embed", group: "block" },
];

function newBlock(kind) {
  const id = `blk_${Math.random().toString(36).slice(2, 10)}`;
  switch (kind) {
    case "para":
      return { id, type: "para", text: "" };
    case "code":
      return { id, type: "code", language: "bash", code: "" };
    case "note_box":
      return { id, type: "note_box", html: "", backgroundColor: "#fef9c3" };
    case "label":
      return { id, type: "label", text: "" };
    case "list":
      return { id, type: "list", items: [""] };
    case "table":
      return { id, type: "table", rows: [["", ""]] };
    case "banner":
      return { id, type: "banner", variant: "info", text: "" };
    case "media":
      return { id, type: "media", src: "", mediaType: "image", caption: "", alt: "" };
    case "media_image":
      return { id, type: "media", src: "", mediaType: "image", caption: "", alt: "" };
    case "media_video":
      return { id, type: "media", src: "", mediaType: "video", caption: "", alt: "" };
    case "media_youtube":
      return { id, type: "media", src: "", mediaType: "youtube", caption: "", alt: "" };
    default:
      return { id, type: "para", text: "" };
  }
}

function PaletteRow({ item, onQuick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pal-${item.kind}`,
    data: { source: "palette", kind: item.kind },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-background p-2 text-left text-sm",
        "hover:border-primary/40 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <button type="button" className="flex flex-1 items-center gap-2 min-w-0">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium truncate">{item.label}</span>
        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{item.desc}</span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onQuick(item.kind);
        }}
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function DropTasksZone({ sectionId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tasks-drop-${sectionId}`,
    data: { zone: "tasks", sectionId },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[36px] rounded-md border border-dashed text-[11px] flex items-center justify-center text-muted-foreground px-2 py-1.5",
        isOver ? "border-primary bg-primary/10 text-primary" : "border-transparent"
      )}
    >
      Drop task here
    </div>
  );
}

function DropStepsZone({ taskId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `steps-drop-${taskId}`,
    data: { zone: "steps", taskId },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[36px] rounded-md border border-dashed text-[11px] flex items-center justify-center text-muted-foreground px-2 py-1.5",
        isOver ? "border-primary bg-primary/10 text-primary" : "border-transparent"
      )}
    >
      Drop step here
    </div>
  );
}

function DropBlocksZone({ dropId, label = "Drop content block here" }) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { zone: "blocks", dropId },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[28px] rounded border border-dashed text-[10px] flex items-center justify-center text-muted-foreground py-1",
        isOver ? "border-primary bg-primary/5" : "border-transparent"
      )}
    >
      {label}
    </div>
  );
}

function SortableShell({ id, children, className }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { sortable: true, sortId: id },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-80 z-50", className)}>
      <div className="flex gap-2 items-start">
        <button type="button" className="mt-2 text-muted-foreground hover:text-foreground touch-none" {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

export default function LabHierarchyBuilder({ labOutline, onChange }) {
  const outline = labOutline && labOutline.sections ? labOutline : defaultLabOutline();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [palKind, setPalKind] = useState(null);
  const endRef = useRef(null);

  const sectionIds = useMemo(() => outline.sections.map((s) => s.id), [outline.sections]);

  const rootDroppableEnabled = outline.sections.length === 0;
  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: "builder-root",
    data: { zone: "builder-root" },
    disabled: !rootDroppableEnabled,
  });

  const setOutline = (next) => onChange({ ...outline, ...next, version: 2 });

  const updateSections = (sections) => setOutline({ sections });
  const resetOutline = () => setOutline(defaultLabOutline());

  const addSection = () => {
    updateSections([
      ...outline.sections,
      {
        id: uid(),
        title: `Section ${outline.sections.length + 1}`,
        blocks: [],
        tasks: [
          {
            id: uid(),
            title: "Task 1",
            anchorId: `task-${outline.sections.length + 1}-1`,
            blocks: [],
            noteAfter: null,
            steps: [
              {
                id: uid(),
                title: "Step 1",
                stepNumber: 1,
                anchorId: `step-${outline.sections.length + 1}-1-1`,
                blocks: [],
                subSteps: [],
                noteAfter: null,
              },
            ],
          },
        ],
      },
    ]);
  };

  const findSectionIndex = (sectionId) => outline.sections.findIndex((s) => s.id === sectionId);

  const addTask = (sectionId) => {
    const si = findSectionIndex(sectionId);
    if (si < 0) return;
    const sec = outline.sections[si];
    const n = (sec.tasks || []).length + 1;
    const next = [...outline.sections];
    next[si] = {
      ...sec,
      tasks: [
        ...(sec.tasks || []),
        {
          id: uid(),
          title: `Task ${n}`,
          anchorId: `task-${sec.id.slice(-6)}-${n}`,
          blocks: [],
          noteAfter: null,
          steps: [
            {
              id: uid(),
              title: "Step 1",
              stepNumber: 1,
              anchorId: `step-${uid().slice(-4)}-1`,
              blocks: [],
              subSteps: [],
              noteAfter: null,
            },
          ],
        },
      ],
    };
    updateSections(next);
  };

  const addStep = (sectionId, taskId) => {
    const si = findSectionIndex(sectionId);
    if (si < 0) return;
    const sec = outline.sections[si];
    const ti = (sec.tasks || []).findIndex((t) => t.id === taskId);
    if (ti < 0) return;
    const task = sec.tasks[ti];
    const n = (task.steps || []).length + 1;
    const next = [...outline.sections];
    const tasks = [...sec.tasks];
    tasks[ti] = {
      ...task,
      steps: [
        ...(task.steps || []),
        {
          id: uid(),
          title: `Step ${n}`,
          stepNumber: n,
          anchorId: `step-${task.id.slice(-6)}-${n}`,
          blocks: [],
          subSteps: [],
          noteAfter: null,
        },
      ],
    };
    next[si] = { ...sec, tasks };
    updateSections(next);
  };

  const addSubStep = (sectionId, taskId, stepId) => {
    const si = findSectionIndex(sectionId);
    if (si < 0) return;
    const sec = outline.sections[si];
    const ti = (sec.tasks || []).findIndex((t) => t.id === taskId);
    if (ti < 0) return;
    const task = sec.tasks[ti];
    const sti = (task.steps || []).findIndex((s) => s.id === stepId);
    if (sti < 0) return;
    const step = task.steps[sti];
    const next = [...outline.sections];
    const steps = [...task.steps];
    steps[sti] = {
      ...step,
      subSteps: [
        ...(step.subSteps || []),
        { id: uid(), title: `Sub-step ${(step.subSteps || []).length + 1}`, blocks: [] },
      ],
    };
    const tasks = [...sec.tasks];
    tasks[ti] = { ...task, steps };
    next[si] = { ...sec, tasks };
    updateSections(next);
  };

  const addBlock = (sectionId, taskId, stepId, kind) => {
    const si = findSectionIndex(sectionId);
    if (si < 0) return;
    const sec = outline.sections[si];
    const ti = (sec.tasks || []).findIndex((t) => t.id === taskId);
    if (ti < 0) return;
    const task = sec.tasks[ti];
    const sti = (task.steps || []).findIndex((s) => s.id === stepId);
    if (sti < 0) return;
    const step = task.steps[sti];
    const next = [...outline.sections];
    const steps = [...task.steps];
    steps[sti] = { ...step, blocks: [...(step.blocks || []), newBlock(kind)] };
    const tasks = [...sec.tasks];
    tasks[ti] = { ...task, steps };
    next[si] = { ...sec, tasks };
    updateSections(next);
  };

  const addSectionBlock = (sectionId, kind) => {
    const si = findSectionIndex(sectionId);
    if (si < 0) return;
    const sec = outline.sections[si];
    const next = [...outline.sections];
    next[si] = { ...sec, blocks: [...(sec.blocks || []), newBlock(kind)] };
    updateSections(next);
  };

  const addTaskBlock = (sectionId, taskId, kind) => {
    const si = findSectionIndex(sectionId);
    if (si < 0) return;
    const sec = outline.sections[si];
    const ti = (sec.tasks || []).findIndex((t) => t.id === taskId);
    if (ti < 0) return;
    const tasks = [...sec.tasks];
    const task = tasks[ti];
    tasks[ti] = { ...task, blocks: [...(task.blocks || []), newBlock(kind)] };
    const next = [...outline.sections];
    next[si] = { ...sec, tasks };
    updateSections(next);
  };

  const addSubStepBlock = (sectionId, taskId, stepId, subStepId, kind) => {
    const si = findSectionIndex(sectionId);
    if (si < 0) return;
    const sec = outline.sections[si];
    const ti = (sec.tasks || []).findIndex((t) => t.id === taskId);
    if (ti < 0) return;
    const task = sec.tasks[ti];
    const sti = (task.steps || []).findIndex((s) => s.id === stepId);
    if (sti < 0) return;
    const step = task.steps[sti];
    const ssi = (step.subSteps || []).findIndex((ss) => ss.id === subStepId);
    if (ssi < 0) return;
    const subSteps = [...(step.subSteps || [])];
    const ss = subSteps[ssi];
    subSteps[ssi] = { ...ss, blocks: [...(ss.blocks || []), newBlock(kind)] };
    const steps = [...task.steps];
    steps[sti] = { ...step, subSteps };
    const tasks = [...sec.tasks];
    tasks[ti] = { ...task, steps };
    const next = [...outline.sections];
    next[si] = { ...sec, tasks };
    updateSections(next);
  };

  const handleDragStart = ({ active }) => {
    if (active.data.current?.source === "palette") setPalKind(active.data.current.kind);
  };

  const handleDragEnd = ({ active, over }) => {
    setPalKind(null);
    if (!over) return;

    if (active.data.current?.source === "palette") {
      const kind = active.data.current.kind;
      const oid = String(over.id);

      const BLOCK_PALETTE = [
        "para",
        "code",
        "note_box",
        "label",
        "list",
        "table",
        "banner",
        "media_image",
        "media_video",
        "media_youtube",
      ];
      if (BLOCK_PALETTE.includes(kind)) {
        let stepId = null;
        if (oid.startsWith("blocks-drop-step-")) stepId = oid.replace("blocks-drop-step-", "");
        if (oid.startsWith("step-card-")) {
          const rest = oid.replace("step-card-", "");
          const [, , sid] = rest.split("::");
          if (sid) stepId = sid;
        }
        if (stepId) {
          for (const sec of outline.sections) {
            for (const task of sec.tasks || []) {
              for (const step of task.steps || []) {
                if (step.id === stepId) {
                  addBlock(sec.id, task.id, stepId, kind);
                  return;
                }
              }
            }
          }
        }
        if (oid.startsWith("blocks-drop-task-")) {
          const taskId = oid.replace("blocks-drop-task-", "");
          for (const sec of outline.sections) {
            const t = (sec.tasks || []).find((x) => x.id === taskId);
            if (t) {
              addTaskBlock(sec.id, taskId, kind);
              return;
            }
          }
        }
        if (oid.startsWith("blocks-drop-section-")) {
          const sectionId = oid.replace("blocks-drop-section-", "");
          addSectionBlock(sectionId, kind);
          return;
        }
        if (oid.startsWith("blocks-drop-substep-")) {
          const subStepId = oid.replace("blocks-drop-substep-", "");
          for (const sec of outline.sections) {
            for (const task of sec.tasks || []) {
              for (const step of task.steps || []) {
                const ss = (step.subSteps || []).find((x) => x.id === subStepId);
                if (ss) {
                  addSubStepBlock(sec.id, task.id, step.id, subStepId, kind);
                  return;
                }
              }
            }
          }
        }
        if (oid.startsWith("task-card-")) {
          const taskId = oid.replace("task-card-", "");
          for (const sec of outline.sections) {
            const t = (sec.tasks || []).find((x) => x.id === taskId);
            if (t) {
              addTaskBlock(sec.id, taskId, kind);
              return;
            }
          }
        }
        if (oid.startsWith("section-card-")) {
          const sectionId = oid.replace("section-card-", "");
          addSectionBlock(sectionId, kind);
          return;
        }
        // Fallback: sometimes the collision target is a sortable container (id=step/task/section/subStep id)
        // instead of the explicit `blocks-drop-*` zone. Accept dropping onto those IDs too.
        for (const sec of outline.sections || []) {
          if (sec.id === oid) {
            addSectionBlock(sec.id, kind);
            return;
          }
          for (const task of sec.tasks || []) {
            if (task.id === oid) {
              addTaskBlock(sec.id, task.id, kind);
              return;
            }
            for (const step of task.steps || []) {
              if (step.id === oid) {
                addBlock(sec.id, task.id, step.id, kind);
                return;
              }
              for (const ss of step.subSteps || []) {
                if (ss.id === oid) {
                  addSubStepBlock(sec.id, task.id, step.id, ss.id, kind);
                  return;
                }
              }
            }
          }
        }
        return;
      }

      if (kind === "section") {
        addSection();
        return;
      }
      if (kind === "task") {
        if (oid.startsWith("tasks-drop-")) addTask(oid.replace("tasks-drop-", ""));
        if (oid.startsWith("section-card-")) addTask(oid.replace("section-card-", ""));
        return;
      }
      if (kind === "step") {
        let taskId = null;
        if (oid.startsWith("steps-drop-")) taskId = oid.replace("steps-drop-", "");
        if (oid.startsWith("task-card-")) taskId = oid.replace("task-card-", "");
        if (oid.startsWith("step-card-")) {
          const rest = oid.replace("step-card-", "");
          const [, tid] = rest.split("::");
          if (tid) taskId = tid;
        }
        if (taskId) {
          for (const sec of outline.sections) {
            const t = (sec.tasks || []).find((x) => x.id === taskId);
            if (t) {
              addStep(sec.id, taskId);
              return;
            }
          }
        }
        return;
      }
      if (kind === "substep" && oid.startsWith("step-card-")) {
        const rest = oid.replace("step-card-", "");
        const [sectionId, taskId, stepId] = rest.split("::");
        if (sectionId && taskId && stepId) addSubStep(sectionId, taskId, stepId);
        return;
      }
      return;
    }

    if (active.id === over.id) return;

    if (sectionIds.includes(active.id) && sectionIds.includes(over.id)) {
      const oldI = sectionIds.indexOf(active.id);
      const newI = sectionIds.indexOf(over.id);
      updateSections(arrayMove(outline.sections, oldI, newI));
      return;
    }

    for (const sec of outline.sections) {
      const tids = (sec.tasks || []).map((t) => t.id);
      if (tids.includes(active.id) && tids.includes(over.id)) {
        const oldI = tids.indexOf(active.id);
        const newI = tids.indexOf(over.id);
        const si = findSectionIndex(sec.id);
        const next = [...outline.sections];
        next[si] = { ...sec, tasks: arrayMove(sec.tasks, oldI, newI) };
        updateSections(next);
        return;
      }
      for (const task of sec.tasks || []) {
        const sids = (task.steps || []).map((s) => s.id);
        if (sids.includes(active.id) && sids.includes(over.id)) {
          const oldI = sids.indexOf(active.id);
          const newI = sids.indexOf(over.id);
          const si = findSectionIndex(sec.id);
          const ti = (sec.tasks || []).findIndex((t) => t.id === task.id);
          const next = [...outline.sections];
          const tasks = [...sec.tasks];
          tasks[ti] = { ...task, steps: arrayMove(task.steps, oldI, newI) };
          next[si] = { ...sec, tasks };
          updateSections(next);
          return;
        }
      }
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [outline.sections.length]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      autoScroll
    >
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <aside className="w-full xl:w-64 shrink-0 xl:sticky xl:top-4 space-y-2 order-2 xl:order-1">
          <Card>
            <CardContent className="p-3 space-y-3">
              <p className="text-xs font-semibold text-primary">Palette — drag or +</p>
              <p className="text-[10px] text-muted-foreground">
                Drag onto dashed zones. Structure: Section → Task → Step → Sub-step. Blocks can be dropped into section,
                task, step, or sub-step bodies (including Notes).
              </p>
              {["structure", "block"].map((g) => (
                <div key={g}>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">{g}</p>
                  <div className="space-y-1">
                    {PALETTE.filter((p) => p.group === g).map((item) => (
                      <PaletteRow key={item.kind} item={item} onQuick={(k) => {
                        if (k === "section") addSection();
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        <div
          ref={setRootDropRef}
          className={cn(
            "flex-1 min-w-0 space-y-3 order-1 xl:order-2",
            isOverRoot && rootDroppableEnabled && "ring-2 ring-primary/30 rounded-lg"
          )}
        >
          <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Hierarchical lab content</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Section → Task → Step → Sub-steps. Use rich text in paragraphs for colored highlights. Place any blocks
                  (including notes) anywhere via drag-and-drop.
                </p>
              </div>
            </div>
          </div>

          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {outline.sections.map((sec) => (
                <SectionCard
                  key={sec.id}
                  section={sec}
                  onPatch={(patch) => {
                    const i = findSectionIndex(sec.id);
                    const next = [...outline.sections];
                    next[i] = { ...sec, ...patch };
                    updateSections(next);
                  }}
                  onRemove={() => updateSections(outline.sections.filter((s) => s.id !== sec.id))}
                  onAddTask={() => addTask(sec.id)}
                  onAddStep={(taskId) => addStep(sec.id, taskId)}
                  onAddSubStep={(taskId, stepId) => addSubStep(sec.id, taskId, stepId)}
                  onAddBlock={(taskId, stepId, k) => addBlock(sec.id, taskId, stepId, k)}
                  onAddSectionBlock={(k) => addSectionBlock(sec.id, k)}
                  onAddTaskBlock={(taskId, k) => addTaskBlock(sec.id, taskId, k)}
                  outline={outline}
                  updateSections={updateSections}
                  findSectionIndex={findSectionIndex}
                />
              ))}
            </div>
          </SortableContext>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 border-dashed" onClick={addSection}>
              <Plus className="w-4 h-4 mr-2" /> Add section
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="shrink-0"
              onClick={resetOutline}
              title="Clear all sections, tasks, steps, and widgets"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Reset lab
            </Button>
          </div>
          <div ref={endRef} className="h-px" />
        </div>
      </div>
      <DragOverlay>{palKind ? <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">Adding…</div> : null}</DragOverlay>
    </DndContext>
  );
}

function SectionCard({
  section,
  onPatch,
  onRemove,
  onAddTask,
  onAddStep,
  onAddSubStep,
  onAddBlock,
  onAddSectionBlock,
  onAddTaskBlock,
  outline,
  updateSections,
  findSectionIndex,
}) {
  const [open, setOpen] = useState(true);
  const taskIds = (section.tasks || []).map((t) => t.id);
  const { setNodeRef: setSectionDropRef, isOver: isOverSection } = useDroppable({
    id: `section-card-${section.id}`,
    data: { zone: "section-card", sectionId: section.id },
  });

  return (
    <Card ref={setSectionDropRef} className={cn("border-2 border-slate-200/80", isOverSection && "ring-2 ring-primary/30")}>
      <CardContent className="p-4 space-y-3">
        <SortableShell id={section.id} className="border-b pb-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(!open)} className="p-1">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <Layers className="w-4 h-4 text-sky-600" />
            <Input
              value={section.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              className="font-semibold flex-1"
              placeholder="Section title"
            />
            <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        </SortableShell>

        {open && (
          <>
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3 pl-2">
                {(section.tasks || []).map((task) => (
                  <TaskCard
                    key={task.id}
                    sectionId={section.id}
                    task={task}
                    outline={outline}
                    updateSections={updateSections}
                    findSectionIndex={findSectionIndex}
                    onAddStep={() => onAddStep(task.id)}
                    onAddSubStep={onAddSubStep}
                    onAddBlock={onAddBlock}
                    onAddTaskBlock={(k) => onAddTaskBlock(task.id, k)}
                  />
                ))}
              </div>
            </SortableContext>
            <div className="space-y-1 rounded-md border border-dashed p-2">
              <DropBlocksZone dropId={`blocks-drop-section-${section.id}`} label="Drop block in section body" />
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.keys(BLOCK_META).map((t) => (
                  <Button key={t} type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onAddSectionBlock(t)}>
                    + {BLOCK_META[t]?.label || t}
                  </Button>
                ))}
              </div>
              {(section.blocks || []).map((b, i) => (
                <BlockEditor
                  key={b.id || i}
                  block={b}
                  onUpdate={(u) => {
                    const blocks = (section.blocks || []).map((x) => (x.id === b.id ? { ...u, id: b.id } : x));
                    onPatch({ blocks });
                  }}
                  onRemove={() => onPatch({ blocks: (section.blocks || []).filter((x) => x.id !== b.id) })}
                />
              ))}
            </div>
            <DropTasksZone sectionId={section.id} />
            <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={onAddTask}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add task
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCard({
  sectionId,
  task,
  outline,
  updateSections,
  findSectionIndex,
  onAddStep,
  onAddSubStep,
  onAddBlock,
  onAddTaskBlock,
}) {
  const si = findSectionIndex(sectionId);
  const sec = outline.sections[si];
  const stepIds = (task.steps || []).map((s) => s.id);
  const { setNodeRef: setTaskDropRef, isOver: isOverTask } = useDroppable({
    id: `task-card-${task.id}`,
    data: { zone: "task-card", sectionId, taskId: task.id },
  });

  const patchTask = (patch) => {
    const next = [...outline.sections];
    const ti = (sec.tasks || []).findIndex((t) => t.id === task.id);
    const tasks = [...sec.tasks];
    tasks[ti] = { ...task, ...patch };
    next[si] = { ...sec, tasks };
    updateSections(next);
  };
  const removeTask = () => {
    const next = [...outline.sections];
    next[si] = { ...sec, tasks: (sec.tasks || []).filter((t) => t.id !== task.id) };
    updateSections(next);
  };

  return (
    <div
      ref={setTaskDropRef}
      className={cn(
        "rounded-xl border border-amber-200/80 bg-amber-50/20 p-3 space-y-2",
        isOverTask && "ring-2 ring-primary/30"
      )}
    >
      <SortableShell id={task.id}>
        <div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-amber-800 uppercase">Task</span>
            <Input value={task.title} onChange={(e) => patchTask({ title: e.target.value })} className="max-w-md h-8" placeholder="Task title" />
            <Input
              value={task.anchorId || ""}
              onChange={(e) => patchTask({ anchorId: e.target.value })}
              className="h-8 font-mono text-xs max-w-[200px]"
              placeholder="anchor-id"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={removeTask} title="Delete task">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          {/* Notes are normal `note_box` blocks now (optional + draggable). */}
        </div>
      </SortableShell>

      <div className="space-y-1 rounded-md border border-dashed p-2">
        <p className="text-[10px] font-semibold text-muted-foreground">Task content (description/media before steps)</p>
        <DropBlocksZone dropId={`blocks-drop-task-${task.id}`} label="Drop block in task body" />
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.keys(BLOCK_META).map((t) => (
            <Button key={t} type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onAddTaskBlock(t)}>
              + {BLOCK_META[t]?.label || t}
            </Button>
          ))}
        </div>
        {(task.blocks || []).map((b) => (
          <BlockEditor
            key={b.id}
            block={b}
            onUpdate={(u) => patchTask({ blocks: (task.blocks || []).map((x) => (x.id === b.id ? { ...u, id: b.id } : x)) })}
            onRemove={() => patchTask({ blocks: (task.blocks || []).filter((x) => x.id !== b.id) })}
          />
        ))}
      </div>

      <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 pl-2 border-l-2 border-amber-200/60">
          {(task.steps || []).map((step) => (
            <StepCard
              key={step.id}
              sectionId={sectionId}
              taskId={task.id}
              step={step}
              outline={outline}
              updateSections={updateSections}
              findSectionIndex={findSectionIndex}
              onAddSubStep={() => onAddSubStep(task.id, step.id)}
              onAddBlock={(k) => onAddBlock(task.id, step.id, k)}
            />
          ))}
        </div>
      </SortableContext>
      <DropStepsZone taskId={task.id} />
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-dashed" onClick={onAddStep}>
        <Plus className="w-3 h-3 mr-1" /> Add step
      </Button>
    </div>
  );
}

function StepCard({ sectionId, taskId, step, outline, updateSections, findSectionIndex, onAddSubStep, onAddBlock }) {
  const si = findSectionIndex(sectionId);
  const sec = outline.sections[si];
  const task = (sec.tasks || []).find((t) => t.id === taskId);
  const sti = (task.steps || []).findIndex((s) => s.id === step.id);

  const { setNodeRef: setDropSubRef } = useDroppable({
    id: `step-card-${sectionId}::${taskId}::${step.id}`,
    data: { zone: "substep", sectionId, taskId, stepId: step.id },
  });

  const patchStep = (patch) => {
    const next = [...outline.sections];
    const tasks = [...sec.tasks];
    const steps = [...task.steps];
    steps[sti] = { ...step, ...patch };
    const ti = tasks.findIndex((t) => t.id === taskId);
    tasks[ti] = { ...task, steps };
    next[si] = { ...sec, tasks };
    updateSections(next);
  };
  const removeStep = () => {
    const next = [...outline.sections];
    const tasks = [...sec.tasks];
    const steps = (task.steps || []).filter((s) => s.id !== step.id);
    const ti = tasks.findIndex((t) => t.id === taskId);
    tasks[ti] = { ...task, steps };
    next[si] = { ...sec, tasks };
    updateSections(next);
  };

  const updateBlock = (bid, updated) => {
    const blocks = (step.blocks || []).map((b) => (b.id === bid ? { ...updated, id: bid } : b));
    patchStep({ blocks });
  };
  const removeBlock = (bid) => patchStep({ blocks: (step.blocks || []).filter((b) => b.id !== bid) });

  const dropId = `step-card-${sectionId}::${taskId}::${step.id}`;

  return (
    <div ref={setDropSubRef} id={dropId} className="rounded-lg border border-blue-200/70 bg-blue-50/10 p-3 space-y-2">
      <SortableShell id={step.id}>
        <div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-blue-800">Step {step.stepNumber}</span>
            <Input
              value={step.title}
              onChange={(e) => patchStep({ title: e.target.value })}
              className="h-8 max-w-lg"
              placeholder="Step title"
            />
            <Input
              value={step.anchorId || ""}
              onChange={(e) => patchStep({ anchorId: e.target.value })}
              className="h-8 font-mono text-xs w-40"
              placeholder="anchor"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={removeStep} title="Delete step">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>

          <p className="text-[10px] font-semibold text-muted-foreground mt-2 mb-1">Step content</p>
          <DropBlocksZone dropId={`blocks-drop-step-${step.id}`} />
          {(step.blocks || []).map((b) => (
            <BlockEditor key={b.id} block={b} onUpdate={(u) => updateBlock(b.id, u)} onRemove={() => removeBlock(b.id)} />
          ))}
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.keys(BLOCK_META).map((t) => (
              <Button key={t} type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onAddBlock(t)}>
                + {BLOCK_META[t]?.label || t}
              </Button>
            ))}
          </div>

          <div className="mt-3 space-y-1">
            <span className="text-[10px] font-semibold flex items-center gap-1">
              <ListTree className="w-3 h-3" /> Sub-steps
            </span>
            {(step.subSteps || []).map((ss, i) => (
              <div key={ss.id} className="border rounded-md p-2 bg-background/80">
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={ss.title}
                    onChange={(e) => {
                      const subSteps = [...(step.subSteps || [])];
                      subSteps[i] = { ...ss, title: e.target.value };
                      patchStep({ subSteps });
                    }}
                    className="h-7 text-sm font-medium"
                    placeholder="Sub-step title"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title="Delete sub-step"
                    onClick={() => {
                      const subSteps = (step.subSteps || []).filter((x) => x.id !== ss.id);
                      patchStep({ subSteps });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
                {(ss.blocks || []).map((b) => (
                  <BlockEditor
                    key={b.id}
                    block={b}
                    onUpdate={(u) => {
                      const subSteps = [...(step.subSteps || [])];
                      const blocks = (ss.blocks || []).map((x) => (x.id === b.id ? { ...u, id: b.id } : x));
                      subSteps[i] = { ...ss, blocks };
                      patchStep({ subSteps });
                    }}
                    onRemove={() => {
                      const subSteps = [...(step.subSteps || [])];
                      subSteps[i] = { ...ss, blocks: (ss.blocks || []).filter((x) => x.id !== b.id) };
                      patchStep({ subSteps });
                    }}
                  />
                ))}
                <DropBlocksZone dropId={`blocks-drop-substep-${ss.id}`} label="Drop block in sub-step" />
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.keys(BLOCK_META).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => {
                        const subSteps = [...(step.subSteps || [])];
                        subSteps[i] = { ...ss, blocks: [...(ss.blocks || []), newBlock(t)] };
                        patchStep({ subSteps });
                      }}
                    >
                      + {BLOCK_META[t]?.label || t}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-dashed" onClick={onAddSubStep}>
              <Plus className="w-3 h-3 mr-1" /> Add sub-step
            </Button>
          </div>

          {/* Notes are normal `note_box` blocks now (optional + draggable). */}
        </div>
      </SortableShell>
    </div>
  );
}

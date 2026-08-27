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
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  BookOpen,
  ClipboardList,
  Code2,
  Flag,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  LayoutTemplate,
  ListChecks,
  ListOrdered,
  MapPin,
  Monitor,
  Plus,
  Sparkles,
  Table2,
  TextQuote,
  Trophy,
  Type,
  Video,
  Youtube,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import LabSection from "@/components/ui/labsection";

let _uid = 0;
const uid = () => `id_${++_uid}_${Math.random().toString(36).slice(2, 8)}`;

const blockId = () => `blk_${Math.random().toString(36).slice(2, 10)}`;

const PALETTE_GROUPS = [
  {
    title: "Document structure",
    items: [
      { kind: "preset_overview", label: "Lab Overview", desc: "H2 heading", icon: BookOpen, color: "text-sky-600", bg: "bg-sky-500/10" },
      { kind: "preset_objectives", label: "Objectives", desc: "H2 heading", icon: ListChecks, color: "text-emerald-600", bg: "bg-emerald-500/10" },
      { kind: "preset_scenario", label: "Scenario", desc: "H2 heading", icon: TextQuote, color: "text-violet-600", bg: "bg-violet-500/10" },
      { kind: "preset_environment", label: "Lab Environment", desc: "H2 heading", icon: Monitor, color: "text-amber-600", bg: "bg-amber-500/10" },
    ],
  },
  {
    title: "Text & layout",
    items: [
      { kind: "title", label: "Title", desc: "Main page title (H1)", icon: Type, color: "text-indigo-600", bg: "bg-indigo-500/10" },
      { kind: "heading", label: "Heading", desc: "Section heading (H2)", icon: LayoutTemplate, color: "text-slate-700", bg: "bg-slate-500/10" },
      { kind: "text", label: "Text / description", desc: "Paragraph block", icon: AlignLeft, color: "text-zinc-600", bg: "bg-zinc-500/10" },
      { kind: "list", label: "Bullet list", desc: "List block", icon: ListOrdered, color: "text-teal-600", bg: "bg-teal-500/10" },
      { kind: "table", label: "Table", desc: "Two-column table", icon: Table2, color: "text-orange-600", bg: "bg-orange-500/10" },
      { kind: "banner", label: "Callout / note", desc: "Info, tip, warning", icon: ClipboardList, color: "text-rose-600", bg: "bg-rose-500/10" },
    ],
  },
  {
    title: "Media & code",
    items: [
      { kind: "code_block", label: "Code block", desc: "Shell, CLI, or code", icon: Code2, color: "text-cyan-600", bg: "bg-cyan-500/10" },
      { kind: "image", label: "Image", desc: "Screenshot or figure", icon: ImageIcon, color: "text-fuchsia-600", bg: "bg-fuchsia-500/10" },
      { kind: "video", label: "Video file", desc: "Uploaded / streamed", icon: Video, color: "text-purple-600", bg: "bg-purple-500/10" },
      { kind: "youtube", label: "YouTube", desc: "Embed URL", icon: Youtube, color: "text-red-600", bg: "bg-red-500/10" },
    ],
  },
  {
    title: "Tasks & finish",
    items: [
      { kind: "preset_content", label: "Rich content", desc: "Multiple blocks, no step #", icon: Layers, color: "text-cyan-700", bg: "bg-cyan-500/10" },
      { kind: "step", label: "Numbered task", desc: "Exercise step + TOC anchor", icon: Flag, color: "text-blue-600", bg: "bg-blue-500/10" },
      { kind: "congrats", label: "Completion", desc: "Congratulations banner", icon: Trophy, color: "text-green-600", bg: "bg-green-500/10" },
    ],
  },
];

function createLabSection(kind, sections = []) {
  const stepCount = sections.filter((s) => s.type === "step").length;

  switch (kind) {
    case "preset_overview":
      return { id: uid(), type: "heading", text: "Lab Overview", level: "normal" };
    case "preset_objectives":
      return { id: uid(), type: "heading", text: "Objectives", level: "normal" };
    case "preset_scenario":
      return { id: uid(), type: "heading", text: "Scenario", level: "normal" };
    case "preset_environment":
      return { id: uid(), type: "heading", text: "Lab Environment", level: "normal" };
    case "preset_content":
      return {
        id: uid(),
        type: "content",
        title: "",
        anchorId: "",
        blocks: [{ id: blockId(), type: "para", text: "" }],
      };
    case "title":
      return { id: uid(), type: "heading", text: "", level: "title" };
    case "heading":
      return { id: uid(), type: "heading", text: "", level: "normal" };
    case "text":
      return {
        id: uid(),
        type: "content",
        title: "",
        anchorId: "",
        blocks: [{ id: blockId(), type: "para", text: "" }],
      };
    case "code_block":
      return {
        id: uid(),
        type: "content",
        title: "",
        anchorId: "",
        blocks: [{ id: blockId(), type: "code", language: "bash", code: "" }],
      };
    case "list":
      return {
        id: uid(),
        type: "content",
        title: "",
        anchorId: "",
        blocks: [{ id: blockId(), type: "list", items: [""] }],
      };
    case "table":
      return {
        id: uid(),
        type: "content",
        title: "",
        anchorId: "",
        blocks: [{ id: blockId(), type: "table", rows: [["", ""]] }],
      };
    case "banner":
      return {
        id: uid(),
        type: "content",
        title: "",
        anchorId: "",
        blocks: [{ id: blockId(), type: "banner", variant: "info", text: "" }],
      };
    case "image":
      return { id: uid(), type: "media", src: "", mediaType: "image", caption: "", alt: "" };
    case "video":
      return { id: uid(), type: "media", src: "", mediaType: "video", caption: "", alt: "" };
    case "youtube":
      return { id: uid(), type: "media", src: "", mediaType: "youtube", caption: "", alt: "" };
    case "step": {
      const n = stepCount + 1;
      return {
        id: uid(),
        type: "step",
        stepNumber: n,
        title: "",
        anchorId: `step-${n}`,
        blocks: [],
      };
    }
    case "congrats":
      return {
        id: uid(),
        type: "congrats",
        labCode: "",
        summary: "You have successfully completed all tasks in this lab.",
      };
    default:
      return null;
  }
}

function PaletteItem({ kind, label, desc, icon: Icon, color, bg, onQuickAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${kind}`,
    data: { source: "palette", kind },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-stretch gap-1 rounded-xl border border-border/80 bg-background transition-all",
        "hover:bg-muted/40 hover:border-primary/30",
        isDragging && "opacity-50 ring-2 ring-primary/15"
      )}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className={cn(
          "flex-1 flex items-center gap-3 p-2.5 text-left min-w-0",
          "cursor-grab active:cursor-grabbing touch-none"
        )}
      >
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm leading-tight">{label}</p>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-auto w-9 shrink-0 rounded-l-none rounded-r-[10px] text-muted-foreground hover:text-primary"
        title="Add to end of page"
        onClick={() => onQuickAdd(kind)}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

function DropCanvasRoot({ hasSections, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-drop",
    data: { type: "canvas-root" },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 border-dashed min-h-[120px] transition-colors",
        hasSections ? "border-transparent min-h-0 p-0" : "border-muted-foreground/25 p-6 bg-muted/20",
        !hasSections && isOver && "border-primary/50 bg-primary/5"
      )}
    >
      {children}
    </div>
  );
}

function CanvasEndDrop() {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-end",
    data: { type: "canvas-end" },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-10 rounded-lg border border-dashed flex items-center justify-center text-[11px] text-muted-foreground transition-colors",
        isOver ? "border-primary bg-primary/10 text-primary font-medium" : "border-transparent hover:border-muted-foreground/20"
      )}
    >
      Drop here to add at end
    </div>
  );
}

function SortableLabRow({ section, index, total, onUpdate, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: { source: "section" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-[100] opacity-90")}>
      <LabSection
        section={section}
        index={index}
        total={total}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={() => {}}
        reorderMode="dnd"
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

function OverlayPreview({ kind }) {
  const meta = PALETTE_GROUPS.flatMap((g) => g.items).find((i) => i.kind === kind);
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-background shadow-2xl",
        "w-[min(100vw-2rem,280px)]"
      )}
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", meta.bg)}>
        <Icon className={cn("w-5 h-5", meta.color)} />
      </div>
      <div>
        <p className="font-semibold text-sm">{meta.label}</p>
        <p className="text-xs text-muted-foreground">Drop on canvas</p>
      </div>
    </div>
  );
}

export default function LabContentBuilder({ labSections = [], onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = useMemo(() => labSections.map((s) => s.id), [labSections]);
  const canvasScrollRef = useRef(null);
  const scrollSentinelRef = useRef(null);
  const [overlayKind, setOverlayKind] = useState(null);

  const setSections = (next) => onChange(next);

  const insertSection = (kind, overId) => {
    const created = createLabSection(kind, labSections);
    if (!created) return;
    if (overId === "canvas-drop" || overId === "canvas-end" || !overId) {
      setSections([...labSections, created]);
      return;
    }
    const overIndex = labSections.findIndex((s) => s.id === overId);
    if (overIndex >= 0) {
      const next = [...labSections];
      next.splice(overIndex, 0, created);
      setSections(next);
    } else {
      setSections([...labSections, created]);
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setOverlayKind(null);
    if (!over) return;

    const src = active.data.current;
    if (src?.source === "palette") {
      insertSection(src.kind, over.id);
      return;
    }

    if (active.id === over.id) return;
    const oldIdx = labSections.findIndex((s) => s.id === active.id);
    const newIdx = labSections.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setSections(arrayMove(labSections, oldIdx, newIdx));
  };

  const handleDragStart = ({ active }) => {
    if (active.data.current?.source === "palette") {
      setOverlayKind(active.data.current.kind);
    }
  };

  const quickAdd = (kind) => {
    insertSection(kind, "canvas-end");
  };

  useEffect(() => {
    scrollSentinelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [labSections.length]);

  const updateSection = (id, updated) => {
    setSections(labSections.map((s) => (s.id === id ? { ...updated, id } : s)));
  };

  const removeSection = (id) => {
    setSections(labSections.filter((s) => s.id !== id));
  };

  const hasSections = labSections.length > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      autoScroll={{ acceleration: 12, interval: 5, threshold: { x: 0.12, y: 0.12 } }}
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left palette — MUST live inside DndContext so useDraggable registers */}
        <aside className="w-full lg:w-[260px] flex-shrink-0 lg:sticky lg:top-4 space-y-3 order-2 lg:order-1">
          <Card className="border shadow-sm">
            <CardContent className="p-4 space-y-4 max-h-[min(70vh,560px)] overflow-y-auto">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary flex items-center gap-2">
                  <ImagePlus className="w-3.5 h-3.5" />
                  Add blocks
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Drag onto the canvas: drop on a row to insert above it, or on the bottom strip to append. Use + to add at
                  the end without dragging.
                </p>
              </div>
              {PALETTE_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group.title}</p>
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <PaletteItem key={item.kind} {...item} onQuickAdd={quickAdd} />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* Canvas */}
        <div ref={canvasScrollRef} className="flex-1 min-w-0 space-y-3 order-1 lg:order-2 w-full">
          <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Content building (legacy flat)</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Build the lab page in the same order as your PDF. Reorder sections with the grip on each card. Match{" "}
                  <span className="font-mono text-[11px]">Anchor ID</span> to the TOC in the next step.
                </p>
              </div>
            </div>
          </div>

          <DropCanvasRoot hasSections={hasSections}>
            {!hasSections && (
              <div className="text-center py-6">
                <MapPin className="w-10 h-10 mx-auto text-muted-foreground/35 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Empty canvas</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Drag blocks from the left onto this area, or use the + on each block to append.
                </p>
              </div>
            )}

            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {labSections.map((section, i) => (
                  <SortableLabRow
                    key={section.id}
                    section={section}
                    index={i}
                    total={labSections.length}
                    onUpdate={(u) => updateSection(section.id, u)}
                    onRemove={() => removeSection(section.id)}
                  />
                ))}
              </div>
            </SortableContext>

            {hasSections && <CanvasEndDrop />}
          </DropCanvasRoot>

          <div ref={scrollSentinelRef} className="h-px w-full" aria-hidden />

          {hasSections && (
            <p className="text-xs text-center text-muted-foreground">
              {labSections.length} block{labSections.length !== 1 ? "s" : ""} on the lab page
            </p>
          )}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{overlayKind ? <OverlayPreview kind={overlayKind} /> : null}</DragOverlay>
    </DndContext>
  );
}

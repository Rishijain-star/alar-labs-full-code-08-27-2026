import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, ChevronDown, ChevronUp, Lock, Unlock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SortableItemShell({
  id,
  title,
  subtitle,
  access,
  collapsed,
  onToggleCollapsed,
  onToggleAccess,
  onDelete,
  children,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-background shadow-sm",
        isDragging && "opacity-80 ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            className="mt-0.5 text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate font-medium text-sm">{title}</div>
              <Badge variant={access === "premium" ? "paid" : "free"} className="text-[10px]">
                {access === "premium" ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Unlock className="h-3 w-3" /> Free
                  </span>
                )}
              </Badge>
            </div>
            {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleAccess}>
            {access === "premium" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapsed}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!collapsed ? <div className="border-t p-4">{children}</div> : null}
    </div>
  );
}

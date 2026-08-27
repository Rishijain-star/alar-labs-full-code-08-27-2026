import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANTS = {
  course: {
    label: "Course",
    className: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200",
  },
  lab: {
    label: "Lab",
    className: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200",
  },
  skill_builder: {
    label: "Skill Builder",
    className: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100",
  },
  cloud_service: {
    label: "Cloud Service",
    className: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-200",
  },
};

/**
 * @param {"course"|"lab"|"skill_builder"} kind
 */
export default function ContentTypeBadge({ kind = "lab", className }) {
  const v = VARIANTS[kind] || VARIANTS.lab;
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase tracking-wide", v.className, className)}>
      {v.label}
    </Badge>
  );
}

import { cn } from "@/lib/utils";

const TONE_STYLES = {
  blue: "bg-blue-100 text-blue-600",
  violet: "bg-violet-100 text-violet-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  indigo: "bg-indigo-100 text-indigo-600",
  sky: "bg-sky-100 text-sky-600",
  rose: "bg-rose-100 text-rose-600",
  orange: "bg-orange-100 text-orange-600",
  premium: "bg-gradient-to-br from-premium/20 to-orange-100 text-premium",
};

export default function TrainingDetailIcon({ icon: Icon, tone = "blue", className }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
        TONE_STYLES[tone] || TONE_STYLES.blue,
        className
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </div>
  );
}

// src/components/ui/StepTabBar.jsx
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StepTabBar — reusable multi-step progress tab bar
 *
 * Props:
 *   steps   Array<{ id, label, icon, desc }>
 *   current number  (active step id)
 *   onChange (id) => void
 */
export function StepTabBar({ steps, current, onChange }) {
    return (
        <div className="mb-8">
            {/* Tab row */}
            <div className="flex items-stretch gap-0 mb-3 overflow-hidden rounded-xl border border-border bg-muted/30">
                {steps.map((s) => {
                    const Icon = s.icon;
                    const done = current > s.id;
                    const active = current === s.id;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => onChange(s.id)}
                            className={cn(
                                "flex-1 flex items-center gap-2 px-3 py-3 transition-all border-r last:border-r-0 border-border text-left",
                                active ? "bg-white shadow-sm" : "hover:bg-muted/50",
                            )}
                        >
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                done ? "bg-green-100 text-green-700" :
                                    active ? "bg-primary text-white" :
                                        "bg-muted text-muted-foreground",
                            )}>
                                {done
                                    ? <CheckCircle className="w-4 h-4" />
                                    : <Icon className="w-3.5 h-3.5" />
                                }
                            </div>
                            <div className="min-w-0 hidden sm:block">
                                <p className={cn(
                                    "text-xs font-semibold truncate",
                                    active ? "text-primary" : done ? "text-green-700" : "text-muted-foreground",
                                )}>
                                    {s.label}
                                </p>
                                {s.desc && (
                                    <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }}
                />
            </div>

            {/* Step label */}
            <div className="flex justify-between mt-1.5">
                <span className="text-xs font-medium text-primary">
                    Step {current}: {steps.find(s => s.id === current)?.label}
                </span>
                <span className="text-xs text-muted-foreground">
                    Step {current} of {steps.length}
                </span>
            </div>
        </div>
    );
}

export default StepTabBar;
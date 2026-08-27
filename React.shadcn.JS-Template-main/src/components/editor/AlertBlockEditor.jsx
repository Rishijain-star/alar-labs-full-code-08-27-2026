import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ALERT_TYPES } from "@/lib/alertTypes";

const ALERT_TYPE_OPTIONS = ALERT_TYPES;

/** Alert content block editor — type + optional custom color */
export default function AlertBlockEditor({ block, onChange }) {
  const update = (updates) => onChange({ ...block, ...updates });
  const selected = ALERT_TYPE_OPTIONS.find((t) => t.value === block.alertType) || ALERT_TYPE_OPTIONS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-amber-900">Alert Block</h3>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Title (optional)</label>
        <Input
          value={block.title || ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Alert title"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Alert type</label>
        <Select
          value={block.alertType || "info"}
          onValueChange={(val) => {
            const t = ALERT_TYPE_OPTIONS.find((x) => x.value === val);
            update({ alertType: val, accentColor: t?.color || block.accentColor });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALERT_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ background: t.color }}
                  />
                  {t.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Custom color (optional)</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={block.accentColor || selected.color}
            onChange={(e) => update({ accentColor: e.target.value })}
            className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
            aria-label="Alert accent color"
          />
          <span className="text-xs text-slate-500">Overrides type color when set</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Message</label>
        <Textarea
          value={block.message || ""}
          onChange={(e) => update({ message: e.target.value })}
          placeholder="Alert message..."
          rows={4}
        />
      </div>
      <div
        className="rounded-lg border-l-4 p-3 text-sm"
        style={{
          borderLeftColor: block.accentColor || selected.color,
          background: `${block.accentColor || selected.color}15`,
        }}
      >
        {block.title ? <p className="font-semibold mb-1">{block.title}</p> : null}
        <p>{block.message || "Preview…"}</p>
      </div>
    </div>
  );
}

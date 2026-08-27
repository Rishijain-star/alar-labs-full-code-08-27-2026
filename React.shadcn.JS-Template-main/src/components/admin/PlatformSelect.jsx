import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DEFAULT_PLATFORMS = [
  "AWS",
  "Azure",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "Linux",
  "Other",
];

/**
 * Platform dropdown with + to add a custom platform (stored in local list for session).
 */
export default function PlatformSelect({ value, onChange, className = "" }) {
  const [customPlatforms, setCustomPlatforms] = useState([]);
  const [newPlatform, setNewPlatform] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const options = [...new Set([...DEFAULT_PLATFORMS, ...customPlatforms, value].filter(Boolean))];

  const handleAdd = () => {
    const trimmed = newPlatform.trim();
    if (!trimmed) return;
    setCustomPlatforms((prev) => [...new Set([...prev, trimmed])]);
    onChange(trimmed);
    setNewPlatform("");
    setShowAdd(false);
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Select value={value || "AWS"} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            {options.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Add new platform"
          onClick={() => setShowAdd((v) => !v)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {showAdd && (
        <div className="flex gap-2 mt-2">
          <Input
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            placeholder="New platform name"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          />
          <Button type="button" size="sm" onClick={handleAdd}>
            Add
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export default function RichText({ value, onChange, className, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = (e) => {
    onChange?.(e.currentTarget.innerHTML);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "min-h-[140px] rounded-md border bg-muted/30 p-3 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 prose max-w-none",
        className
      )}
      contentEditable
      onInput={handleInput}
      data-placeholder={placeholder}
      suppressContentEditableWarning
    />
  );
}

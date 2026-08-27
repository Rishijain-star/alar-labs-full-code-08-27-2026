// src/components/ui/RichEditor.jsx
import { useRef } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter } from "lucide-react";

/**
 * RichEditor — contentEditable rich text editor with toolbar
 *
 * Props:
 *   value        string (HTML)
 *   onChange     (html: string) => void
 *   placeholder  string
 *   minHeight    string  (default "80px")
 */
export function RichEditor({ value, onChange, placeholder, minHeight = "80px" }) {
    const editorRef = useRef(null);
    const initialized = useRef(false);

    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#1e293b"];

    const exec = (cmd, val = null) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, val);
    };

    return (
        <div className="border border-border rounded-lg overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-muted/20 flex-wrap">
                {[
                    { Icon: Bold, cmd: "bold", title: "Bold" },
                    { Icon: Italic, cmd: "italic", title: "Italic" },
                    { Icon: Underline, cmd: "underline", title: "Underline" },
                ].map(({ Icon, cmd, title }) => (
                    <button
                        key={cmd}
                        type="button"
                        title={title}
                        onMouseDown={e => { e.preventDefault(); exec(cmd); }}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                    >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                ))}

                <div className="w-px h-4 bg-border mx-1" />

                <span className="text-xs text-muted-foreground mr-1">Color:</span>
                {colors.map(c => (
                    <button
                        key={c}
                        type="button"
                        title={c}
                        onMouseDown={e => { e.preventDefault(); exec("foreColor", c); }}
                        className="w-4 h-4 rounded-full border-2 border-white shadow hover:scale-125 transition-transform flex-shrink-0"
                        style={{ background: c, outline: "1px solid #e2e8f0" }}
                    />
                ))}
                {/* Custom color picker (applies to selected text) */}
                <input
                    type="color"
                    title="Custom color"
                    aria-label="Custom color"
                    onChange={(e) => exec("foreColor", e.target.value)}
                    className="ml-2 w-7 h-7 p-0 rounded border border-border bg-background cursor-pointer"
                />

                <div className="w-px h-4 bg-border mx-1" />

                {[
                    { Icon: AlignLeft, cmd: "justifyLeft", title: "Align Left" },
                    { Icon: AlignCenter, cmd: "justifyCenter", title: "Center" },
                ].map(({ Icon, cmd, title }) => (
                    <button
                        key={cmd}
                        type="button"
                        title={title}
                        onMouseDown={e => { e.preventDefault(); exec(cmd); }}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                    >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                ))}
            </div>

            {/* Editable area */}
            <div
                ref={el => {
                    editorRef.current = el;
                    if (el && !initialized.current) {
                        el.innerHTML = value || "";
                        initialized.current = true;
                    }
                }}
                contentEditable
                suppressContentEditableWarning
                onInput={() => onChange(editorRef.current?.innerHTML || "")}
                data-placeholder={placeholder}
                className="p-3 text-sm outline-none"
                style={{ minHeight, lineHeight: 1.65 }}
            />

            <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
      `}</style>
        </div>
    );
}

export default RichEditor;

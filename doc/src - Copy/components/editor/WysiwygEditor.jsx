"use client";

import { useEffect, useRef, useState } from "react";
import { loadCKEditor } from "@/lib/ckeditorLoader";
import { Textarea } from "@/components/ui/textarea";

export default function WysiwygEditor({
    value,
    onChange,
    placeholder = "Write here...",
    minHeight = 140,
}) {
    const editorRef = useRef(null);
    const containerRef = useRef(null);

    const [ready, setReady] = useState(false);
    const [error, setError] = useState(false);

    // init editor
    useEffect(() => {
        let mounted = true;

        loadCKEditor()
            .then((ClassicEditor) => {
                if (!mounted || !containerRef.current) return;

                ClassicEditor.create(containerRef.current, {
                    initialData: value || "",
                    placeholder,
                    toolbar: [
                        "heading",
                        "|",
                        "bold",
                        "italic",
                        "underline",
                        "strikethrough",
                        "|",
                        "bulletedList",
                        "numberedList",
                        "|",
                        "link",
                        "blockQuote",
                        "|",
                        "undo",
                        "redo",
                    ],
                }).then((editor) => {
                    editorRef.current = editor;
                    setReady(true);

                    editor.model.document.on("change:data", () => {
                        const data = editor.getData();
                        onChange?.(data);
                    });
                });
            })
            .catch(() => setError(true));

        return () => {
            mounted = false;
            if (editorRef.current) {
                editorRef.current.destroy().catch(() => { });
                editorRef.current = null;
            }
        };
    }, []);

    // external value sync
    useEffect(() => {
        if (editorRef.current && value !== undefined) {
            const current = editorRef.current.getData();
            if (current !== value) {
                editorRef.current.setData(value || "");
            }
        }
    }, [value]);

    // fallback
    if (error) {
        return (
            <Textarea
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
                style={{ minHeight }}
               
            />
        );
    }

    return (
        <div className="rounded-md border bg-background overflow-hidden">
            <div
                ref={containerRef}
                style={{ minHeight }}
                className="prose prose-sm max-w-none"
            />

            {!ready && (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    Loading editor...
                </div>
            )}
        </div>
    );
}
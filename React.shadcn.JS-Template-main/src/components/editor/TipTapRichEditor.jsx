import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import BulletList from "@tiptap/extension-bullet-list";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "@/lib/tiptap/fontSizeExtension";
import { DocumentFontCommands } from "@/lib/tiptap/documentFontExtension";
import { OutlineListKit } from "@/lib/tiptap/outlineListExtension";
import { AlertBox } from "@/lib/tiptap/alertBoxExtension";
import { ResizableImage } from "@/lib/tiptap/resizableImageExtension";
import { attachTiptapImageEnhancer } from "@/lib/tiptap/imageEnhancer";
import TipTapToolbar from "@/components/editor/TipTapToolbar";
import OutlineListDialog from "@/components/editor/OutlineListDialog";
import { nestedHtmlToOutlineText } from "@/lib/outlineListParser";
import { propagateListItemColorsInHtml } from "@/lib/prepareQuillHtml";
import { safeEditorDom, safeEditorView, whenEditorDomReady } from "@/lib/tiptap/editorMount";
import "@/styles/tiptap-editor.css";

function findOutlineRoot(target, root) {
  const ol = target.closest?.("ol[data-outline-list], ol.outline-list");
  if (!ol || !root.contains(ol)) return null;
  return ol;
}

function replaceOutlineDom(editor, domNode, html) {
  const view = safeEditorView(editor);
  if (!view) return false;
  const from = view.posAtDOM(domNode, 0);
  if (from < 0) return false;

  const $pos = editor.state.doc.resolve(from);
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name !== "orderedList") continue;
    const nodePos = $pos.before(depth);
    editor
      .chain()
      .focus()
      .deleteRange({ from: nodePos, to: nodePos + node.nodeSize })
      .insertContentAt(nodePos, html)
      .run();
    return true;
  }
  return false;
}

/**
 * Full-featured rich text editor (TipTap) — headings, colors, outline lists, images, etc.
 */
export default function TipTapRichEditor({
  value = "",
  onChange,
  placeholder = "Write here…",
  minHeight = 280,
  maxHeight = 400,
  className = "",
  editorKey,
  compact = false,
}) {
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const lastEmittedHtmlRef = useRef(value || "");
  const skipExternalSyncRef = useRef(false);
  const editingOutlineRef = useRef(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineSeed, setOutlineSeed] = useState("");

  onChangeRef.current = onChange;

  const pushHtmlToParent = useCallback((html) => {
    lastEmittedHtmlRef.current = html;
    skipExternalSyncRef.current = true;
    onChangeRef.current?.(html);
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          orderedList: false,
          listItem: false,
          bulletList: false,
        }),
        ...OutlineListKit,
        AlertBox,
        BulletList,
        Underline,
        TextStyle,
        FontFamily.configure({ types: ["textStyle"] }),
        FontSize,
        DocumentFontCommands,
        Color,
        Highlight.configure({ multicolor: true }),
        Subscript,
        Superscript,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer" },
        }),
        ResizableImage.configure({
          inline: false,
          allowBase64: true,
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: value || "",
      editorProps: {
        attributes: {
          class: "tiptap-editor-body ProseMirror",
        },
      },
      onUpdate: ({ editor: ed }) => {
        let html = propagateListItemColorsInHtml(ed.getHTML());
        lastEmittedHtmlRef.current = html;
        skipExternalSyncRef.current = true;
        onChangeRef.current?.(html);
      },
    },
    [editorKey],
  );

  useEffect(() => {
    if (!editor) return;

    let cancelled = false;
    let cleanup = null;
    let rafId = 0;

    const tryAttach = () => {
      if (cancelled || editor.isDestroyed) return;
      if (!containerRef.current?.querySelector(".ProseMirror")) {
        rafId = requestAnimationFrame(tryAttach);
        return;
      }
      cleanup?.();
      cleanup = attachTiptapImageEnhancer(editor, containerRef.current, pushHtmlToParent) || null;
    };

    const stopDomReady = whenEditorDomReady(editor, () => {
      tryAttach();
      return () => {
        cancelAnimationFrame(rafId);
        cleanup?.();
        cleanup = null;
      };
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stopDomReady();
      cleanup?.();
    };
  }, [editor, pushHtmlToParent]);

  useEffect(() => {
    if (!editor) return;

    const onDblClick = (event) => {
      const root = safeEditorDom(editor);
      if (!root) return;
      const ol = findOutlineRoot(event.target, root);
      if (!ol) return;
      event.preventDefault();
      editingOutlineRef.current = ol;
      setOutlineSeed(nestedHtmlToOutlineText(ol.outerHTML));
      setOutlineOpen(true);
    };

    return whenEditorDomReady(editor, (root) => {
      root.addEventListener("dblclick", onDblClick);
      return () => root.removeEventListener("dblclick", onDblClick);
    });
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }

    const next = value || "";
    const current = editor.getHTML();
    if (next === current || next === lastEmittedHtmlRef.current) return;

    lastEmittedHtmlRef.current = next;
    if (!editor.isDestroyed) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  const insertOutlineHtml = useCallback(
    (html) => {
      if (!editor || editor.isDestroyed || !html?.trim()) return;

      editor.chain().focus();

      const existing = editingOutlineRef.current;
      const dom = safeEditorDom(editor);
      if (existing && dom?.contains(existing)) {
        if (replaceOutlineDom(editor, existing, html)) {
          editingOutlineRef.current = null;
          pushHtmlToParent(editor.getHTML());
          return;
        }
      }

      editor.chain().focus().insertContent(html).run();
      pushHtmlToParent(editor.getHTML());
    },
    [editor, pushHtmlToParent],
  );

  const minHeightCss =
    typeof minHeight === "number" ? `${minHeight}px` : minHeight;
  const maxHeightCss =
    typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

  return (
    <>
      <div
        ref={containerRef}
        className={`tiptap-rich-editor rounded-lg border border-slate-300 bg-white overflow-hidden ${compact ? "tiptap-rich-editor-compact" : ""} ${className}`}
        style={{
          "--editor-min-height": minHeightCss,
          "--editor-max-height": maxHeightCss,
        }}
      >
        <TipTapToolbar
          editor={editor}
          onOpenOutline={() => {
            editingOutlineRef.current = null;
            setOutlineSeed("");
            setOutlineOpen(true);
          }}
        />
        <div className="tiptap-editor-scroll">
          <EditorContent editor={editor} />
        </div>
      </div>

      <OutlineListDialog
        open={outlineOpen}
        onOpenChange={(open) => {
          setOutlineOpen(open);
          if (!open) editingOutlineRef.current = null;
        }}
        initialText={outlineSeed}
        onInsert={insertOutlineHtml}
      />
    </>
  );
}

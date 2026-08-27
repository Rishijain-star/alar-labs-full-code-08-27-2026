import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlertTriangle,
  Bold,
  Code,
  Eraser,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTree,
  Quote,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALERT_TYPES } from "@/lib/alertTypes";
import FontToolbarControls from "@/components/editor/FontToolbarControls";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded border border-transparent px-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-40",
        active && "border-slate-300 bg-white text-slate-900 shadow-sm",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-300" />;
}

function ColorInput({ title, value, onChange }) {
  return (
    <label
      title={title}
      className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded hover:bg-slate-200"
    >
      <span className="text-xs font-bold text-slate-600">A</span>
      <input
        type="color"
        value={value}
        onChange={onChange}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <span
        className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded"
        style={{ backgroundColor: value }}
      />
    </label>
  );
}

export default function TipTapToolbar({ editor, onOpenOutline }) {
  const imageInputRef = useRef(null);
  const [alertOpen, setAlertOpen] = useState(false);

  if (!editor) return null;

  const inAlert = editor.isActive("alertBox");
  const activeAlertType =
    editor.getAttributes("alertBox").alertType || "info";

  const insertAlert = (alertType) => {
    if (inAlert) {
      editor.chain().focus().setAlertBoxType(alertType).run();
    } else {
      editor.chain().focus().insertAlertBox({ alertType }).run();
    }
    setAlertOpen(false);
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    imageInputRef.current?.click();
  };

  const onImageFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file (JPG, PNG, GIF, WebP).");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        editor
          .chain()
          .focus()
          .insertImageAndContinue({ src: reader.result, align: "center" })
          .run();
      }
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const clearFormatting = () => {
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  };

  return (
    <div className="tiptap-toolbar flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 p-2">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageFile}
      />
      <select
        className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
        value={
          editor.isActive("heading", { level: 1 })
            ? "1"
            : editor.isActive("heading", { level: 2 })
              ? "2"
              : editor.isActive("heading", { level: 3 })
                ? "3"
                : editor.isActive("heading", { level: 4 })
                  ? "4"
                  : editor.isActive("heading", { level: 5 })
                    ? "5"
                    : editor.isActive("heading", { level: 6 })
                      ? "6"
                      : "p"
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === "p") {
            editor.chain().focus().setParagraph().run();
          } else {
            editor
              .chain()
              .focus()
              .toggleHeading({ level: Number(val) })
              .run();
          }
        }}
      >
        <option value="p">Normal</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
        <option value="5">Heading 5</option>
        <option value="6">Heading 6</option>
      </select>

      <FontToolbarControls editor={editor} />

      <ToolbarDivider />

      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ColorInput
        title="Text / bullet color (in lists, bullets match text color)"
        value={editor.getAttributes("textStyle").color || "#000000"}
        onChange={(e) =>
          editor.chain().focus().setColor(e.target.value).run()
        }
      />
      <ColorInput
        title="Highlight"
        value={editor.getAttributes("highlight").color || "#ffff00"}
        onChange={(e) =>
          editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
        }
      />

      <ToolbarDivider />

      <ToolbarButton
        title="Subscript"
        active={editor.isActive("subscript")}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      >
        <Subscript className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Superscript"
        active={editor.isActive("superscript")}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      >
        <Superscript className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Outline list (1 → a → i)"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Insert structured outline" onClick={onOpenOutline}>
        <ListTree className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Decrease indent"
        onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        disabled={!editor.can().liftListItem("listItem")}
      >
        <IndentDecrease className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Increase indent"
        onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        disabled={!editor.can().sinkListItem("listItem")}
      >
        <IndentIncrease className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <Popover open={alertOpen} onOpenChange={setAlertOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={inAlert ? "Change alert type" : "Insert alert / note box"}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded border border-transparent px-1.5 text-slate-700 hover:bg-slate-200",
              inAlert && "border-slate-300 bg-white text-slate-900 shadow-sm",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-[200] w-56 p-2" align="start">
          <p className="mb-2 px-1 text-xs font-semibold text-slate-600">
            {inAlert ? "Alert type" : "Insert alert box"}
          </p>
          <div className="grid gap-1">
            {ALERT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => insertAlert(t.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100",
                  (inAlert ? activeAlertType : "") === t.value &&
                    "bg-slate-100 font-medium",
                )}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: t.color }}
                />
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-[10px] leading-snug text-slate-500">
            Type inside the box. Press Enter on an empty line or Ctrl+Enter to
            continue normal text below.
          </p>
        </PopoverContent>
      </Popover>

      <ToolbarDivider />

      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Image from computer" onClick={addImage}>
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton title="Clear formatting" onClick={clearFormatting}>
        <Eraser className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

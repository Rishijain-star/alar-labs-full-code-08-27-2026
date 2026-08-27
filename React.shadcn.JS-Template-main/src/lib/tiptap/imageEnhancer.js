import { safeEditorView } from "@/lib/tiptap/editorMount";

const HANDLE_NAMES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN_SIZE = 40;

function parsePx(value) {
  if (!value) return null;
  const n = parseInt(String(value).replace(/px$/, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function getRelativeRect(el, container) {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    top: elRect.top - containerRect.top + container.scrollTop,
    left: elRect.left - containerRect.left + container.scrollLeft,
    width: elRect.width,
    height: elRect.height,
  };
}

function ensureOverlayLayer(container) {
  let layer = container.querySelector(".tiptap-image-overlay-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "tiptap-image-overlay-layer";
    container.appendChild(layer);
  }
  return layer;
}

function findImagePos(editor, img) {
  const view = safeEditorView(editor);
  if (!view) return null;
  let found = null;
  editor.state.doc.descendants((node, pos) => {
    if (found != null) return false;
    if (node.type.name !== "image") return;
    const dom = view.nodeDOM(pos);
    if (dom === img || dom?.querySelector?.("img") === img) {
      found = pos;
      return false;
    }
    return undefined;
  });
  return found;
}

function clearAlignStyles(img) {
  img.style.float = "";
  img.style.display = "";
  img.style.verticalAlign = "";
  img.style.marginLeft = "";
  img.style.marginRight = "";
  img.style.marginBottom = "";
  img.style.marginTop = "";
}

function applyAlignStyles(img, align) {
  clearAlignStyles(img);
  const wrap = img.closest(".tiptap-image-wrap");
  if (wrap) wrap.dataset.imageAlign = align;

  if (align === "left") {
    img.style.float = "left";
    img.style.marginRight = "1rem";
    img.style.marginBottom = "0.5rem";
  } else if (align === "right") {
    img.style.float = "right";
    img.style.marginLeft = "1rem";
    img.style.marginBottom = "0.5rem";
  } else if (align === "inline") {
    img.style.display = "inline-block";
    img.style.verticalAlign = "top";
    img.style.marginRight = "0.5rem";
    img.style.marginBottom = "0.25rem";
  } else {
    img.style.display = "block";
    img.style.marginLeft = "auto";
    img.style.marginRight = "auto";
    img.style.marginBottom = "0.5rem";
  }
  img.dataset.align = align;
}

function setImageWidthPx(img, prose, widthPx) {
  const editorW = prose?.clientWidth || 800;
  const naturalW = img.naturalWidth || img.offsetWidth || 400;
  const naturalH = img.naturalHeight || img.offsetHeight || 300;
  const ratio = naturalH / Math.max(naturalW, 1);
  const pxW = Math.max(MIN_SIZE, Math.min(Math.round(widthPx), editorW));
  const pxH = Math.max(MIN_SIZE, Math.round(pxW * ratio));
  img.style.width = `${pxW}px`;
  img.style.height = `${pxH}px`;
  img.style.maxWidth = "100%";
  return { width: String(pxW), height: String(pxH) };
}

function setImageWidthPreset(img, prose, preset) {
  const editorW = prose?.clientWidth || 800;
  if (typeof preset === "string" && preset.endsWith("%")) {
    const pct = parseFloat(preset) / 100;
    return setImageWidthPx(img, prose, editorW * pct);
  }
  return setImageWidthPx(img, prose, preset);
}

let activeState = null;

function hideImageTools() {
  if (!activeState) return;
  const { img, toolbar, handles, onDocClick, onScroll, scrollEl } = activeState;
  img?.classList.remove("tiptap-image-selected");
  toolbar?.remove();
  handles?.forEach((h) => h.remove());
  document.removeEventListener("mousedown", onDocClick, true);
  if (scrollEl && onScroll) scrollEl.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", activeState.onResize);
  activeState = null;
}

function highlightActiveAlign(bar, align) {
  bar.querySelectorAll("[data-align]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.align === align);
  });
}

function positionImageUi(container) {
  if (!activeState || !container) return;
  const { img, toolbar, handles } = activeState;
  if (!img || !toolbar) return;

  const { top, left, width, height } = getRelativeRect(img, container);
  const half = 7;

  toolbar.style.top = `${Math.max(4, top - 42)}px`;
  toolbar.style.left = `${Math.max(4, Math.min(left, container.clientWidth - 320))}px`;

  const positions = {
    nw: { top: top - half, left: left - half },
    n: { top: top - half, left: left + width / 2 - half },
    ne: { top: top - half, left: left + width - half },
    e: { top: top + height / 2 - half, left: left + width - half },
    se: { top: top + height - half, left: left + width - half },
    s: { top: top + height - half, left: left + width / 2 - half },
    sw: { top: top + height - half, left: left - half },
    w: { top: top + height / 2 - half, left: left - half },
  };

  handles.forEach((handle) => {
    const name = [...handle.classList]
      .find((c) => c.startsWith("tiptap-image-handle-"))
      ?.replace("tiptap-image-handle-", "");
    const pos = positions[name];
    if (!pos) return;
    handle.style.top = `${pos.top}px`;
    handle.style.left = `${pos.left}px`;
  });
}

function persistImageAttrs(editor, pos, attrs, onSync) {
  if (pos == null) return;
  editor.chain().focus().setNodeSelection(pos).updateAttributes("image", attrs).run();
  onSync?.(editor.getHTML());
}

function createToolbar(img, editor, pos, prose, container, onSync) {
  const bar = document.createElement("div");
  bar.className = "tiptap-image-tools";
  bar.setAttribute("role", "toolbar");
  bar.innerHTML = `
    <span class="tiptap-image-tools-label">Image</span>
    <button type="button" data-align="left" title="Float left">Left</button>
    <button type="button" data-align="center" title="Center">Center</button>
    <button type="button" data-align="right" title="Float right">Right</button>
    <button type="button" data-align="inline" title="Inline">Inline</button>
    <span class="tiptap-image-tools-sep" aria-hidden="true"></span>
    <button type="button" data-width="25%" title="25% width">S</button>
    <button type="button" data-width="50%" title="50% width">M</button>
    <button type="button" data-width="75%" title="75% width">L</button>
    <button type="button" data-width="100%" title="Full width">Full</button>
    <span class="tiptap-image-tools-hint">Drag corners to resize</span>
  `;

  bar.addEventListener("mousedown", (e) => e.preventDefault());
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const { align, width } = btn.dataset;
    const nextAttrs = {};

    if (align) {
      applyAlignStyles(img, align);
      nextAttrs.align = align;
      highlightActiveAlign(bar, align);
    }
    if (width) {
      const size = setImageWidthPreset(img, prose, width);
      nextAttrs.width = size.width;
      nextAttrs.height = size.height;
    }

    if (Object.keys(nextAttrs).length) {
      persistImageAttrs(editor, pos, nextAttrs, onSync);
      positionImageUi(container);
    }
  });

  highlightActiveAlign(bar, img.dataset.align || "center");
  return bar;
}

function createResizeHandles(layer, img, editor, pos, prose, container, onSync) {
  return HANDLE_NAMES.map((name) => {
    const handle = document.createElement("span");
    handle.className = `tiptap-image-handle tiptap-image-handle-${name}`;
    handle.title = "Drag to resize";
    layer.appendChild(handle);

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const rect = img.getBoundingClientRect();
      const startW = rect.width;
      const startH = rect.height;
      const startMarginLeft = parseFloat(img.style.marginLeft) || 0;
      const maxW = prose?.clientWidth || 2000;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let newW = startW;
        let newH = startH;
        let marginLeft = startMarginLeft;

        switch (name) {
          case "e":
            newW = startW + dx;
            break;
          case "w":
            newW = startW - dx;
            marginLeft = startMarginLeft + (startW - newW);
            break;
          case "s":
            newH = startH + dy;
            break;
          case "n":
            newH = startH - dy;
            break;
          case "se":
            newW = startW + dx;
            newH = startH + dy;
            break;
          case "sw":
            newW = startW - dx;
            newH = startH + dy;
            marginLeft = startMarginLeft + (startW - newW);
            break;
          case "ne":
            newW = startW + dx;
            newH = startH - dy;
            break;
          case "nw":
            newW = startW - dx;
            newH = startH - dy;
            marginLeft = startMarginLeft + (startW - newW);
            break;
          default:
            break;
        }

        newW = Math.max(MIN_SIZE, Math.min(newW, maxW));
        newH = Math.max(MIN_SIZE, newH);

        img.style.width = `${Math.round(newW)}px`;
        img.style.height = `${Math.round(newH)}px`;

        if (name === "w" || name === "sw" || name === "nw") {
          img.style.marginLeft =
            Math.abs(marginLeft) > 0.5 ? `${Math.round(marginLeft)}px` : "";
        }

        positionImageUi(container);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const width = parsePx(img.style.width) || parsePx(img.width);
        const height = parsePx(img.style.height) || parsePx(img.height);
        persistImageAttrs(
          editor,
          pos,
          {
            width: width ? String(width) : null,
            height: height ? String(height) : null,
            align: img.dataset.align || "center",
          },
          onSync,
        );
        positionImageUi(container);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    return handle;
  });
}

function showImageTools(img, editor, container, prose, onSync) {
  hideImageTools();

  const pos = findImagePos(editor, img);
  if (pos == null) return;

  const layer = ensureOverlayLayer(container);
  const toolbar = createToolbar(img, editor, pos, prose, container, onSync);
  layer.appendChild(toolbar);
  const handles = createResizeHandles(layer, img, editor, pos, prose, container, onSync);

  img.classList.add("tiptap-image-selected");
  if (!img.dataset.align) applyAlignStyles(img, "center");

  const onDocClick = (e) => {
    if (
      toolbar.contains(e.target) ||
      handles.some((h) => h.contains(e.target)) ||
      img === e.target ||
      img.contains(e.target)
    ) {
      return;
    }
    hideImageTools();
  };

  const scrollEl = container.querySelector(".tiptap-editor-scroll") || container;
  const onScroll = () => positionImageUi(container);
  const onResize = () => positionImageUi(container);

  scrollEl.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("mousedown", onDocClick, true);

  activeState = {
    img,
    toolbar,
    handles,
    onDocClick,
    onScroll,
    onResize,
    scrollEl,
  };

  positionImageUi(container);
}

export function attachTiptapImageEnhancer(editor, containerEl, onSync) {
  if (!editor || editor.isDestroyed || !containerEl) return () => {};
  if (!safeEditorView(editor)) return () => {};

  const prose = containerEl.querySelector(".ProseMirror");
  if (!prose) return () => {};

  const onProseClick = (event) => {
    const img = event.target.closest("img");
    if (!img || !prose.contains(img)) {
      hideImageTools();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    showImageTools(img, editor, containerEl, prose, onSync);
  };

  const onSelectionUpdate = () => {
    const view = safeEditorView(editor);
    if (!view) return;
    const { selection } = editor.state;
    if (selection?.node?.type?.name === "image") {
      const dom = view.nodeDOM(selection.from);
      const img = dom?.tagName === "IMG" ? dom : dom?.querySelector?.("img");
      if (img) showImageTools(img, editor, containerEl, prose, onSync);
    }
  };

  prose.addEventListener("click", onProseClick);
  editor.on("selectionUpdate", onSelectionUpdate);

  return () => {
    hideImageTools();
    prose.removeEventListener("click", onProseClick);
    editor.off("selectionUpdate", onSelectionUpdate);
    containerEl.querySelector(".tiptap-image-overlay-layer")?.remove();
  };
}

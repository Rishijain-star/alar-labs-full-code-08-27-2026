/**
 * Image tools for Quill: align, 8-way resize, drag-to-reposition.
 * UI is mounted on the editor container overlay so nothing gets clipped.
 */

import Quill from "quill";
import { commitImageSize } from "./imageBlot";

const HANDLE_NAMES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function syncHtml(quill, onSync) {
  if (!quill || typeof onSync !== "function") return;
  quill.root.querySelectorAll("img").forEach((img) => {
    if (img.style.width && img.style.height && !img.getAttribute("height")) {
      commitImageSize(img);
    }
  });
  onSync(quill.root.innerHTML);
}

function getImageBlockElement(img) {
  const parent = img?.parentElement;
  if (parent?.tagName === "P") return parent;
  return img;
}

function ensureParagraphAfterImage(img, quill) {
  if (!img?.parentElement || !quill?.root) return null;

  let imageBlock = getImageBlockElement(img);
  if (img.parentElement === quill.root) {
    const wrapper = document.createElement("p");
    quill.root.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    imageBlock = wrapper;
  }

  const align = img.dataset.align || "center";
  const blockAligns = align === "center" || !img.dataset.align;
  if (blockAligns) {
    const hasOtherContent = [...imageBlock.childNodes].some(
      (node) =>
        node !== img &&
        (node.nodeType !== Node.TEXT_NODE || node.textContent.trim())
    );
    if (hasOtherContent) {
      const solo = document.createElement("p");
      img.remove();
      solo.appendChild(img);
      imageBlock.parentNode.insertBefore(solo, imageBlock.nextSibling);
      imageBlock = solo;
    }
  }

  let next = imageBlock.nextElementSibling;
  if (!next || !/^(P|H[1-6]|DIV|BLOCKQUOTE)$/i.test(next.tagName)) {
    next = document.createElement("p");
    next.appendChild(document.createElement("br"));
    imageBlock.parentNode.insertBefore(next, imageBlock.nextSibling);
  } else if (
    !next.textContent.trim() &&
    !next.querySelector("img, video, iframe")
  ) {
    if (!next.querySelector("br")) next.appendChild(document.createElement("br"));
  }

  if (align === "left" || align === "right") {
    next.classList.add("quill-image-block-after");
  } else {
    next.classList.remove("quill-image-block-after");
  }

  return next;
}

function placeCursorInParagraph(quill, paragraph) {
  if (!paragraph || !quill) return false;
  quill.focus();
  const blot = Quill.find(paragraph);
  if (blot) {
    quill.setSelection(quill.getIndex(blot), 0, "user");
    return true;
  }
  const range = document.createRange();
  const target = paragraph.querySelector("br") || paragraph;
  range.setStart(target, 0);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  return true;
}

function placeCursorAfterImage(img, quill) {
  const align = img.dataset.align || "center";
  if (align === "left" || align === "right" || align === "inline") return;
  const para = ensureParagraphAfterImage(img, quill);
  if (para) placeCursorInParagraph(quill, para);
}

function handleClickBelowImage(e, quill, onSync) {
  if (!quill?.root?.contains(e.target)) return false;

  const clickY = e.clientY;
  const clickX = e.clientX;

  for (const img of quill.root.querySelectorAll("img")) {
    const block = getImageBlockElement(img);
    const blockRect = block.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const align = img.dataset.align || "center";

    const isBelow = clickY >= imgRect.bottom - 10;
    const inHorizontalBand =
      clickX >= imgRect.left - 32 && clickX <= imgRect.right + 32;
    if (!isBelow || !inHorizontalBand) continue;

    if (align === "left" && clickY < blockRect.bottom - 8 && clickX > imgRect.right) {
      continue;
    }
    if (align === "right" && clickY < blockRect.bottom - 8 && clickX < imgRect.left) {
      continue;
    }

    const para = ensureParagraphAfterImage(img, quill);
    if (!para || para.contains(e.target)) continue;

    placeCursorInParagraph(quill, para);
    hideImageTools();
    syncHtml(quill, onSync);
    return true;
  }

  return false;
}

function getRelativeRect(el, container) {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    top: elRect.top - containerRect.top,
    left: elRect.left - containerRect.left,
    width: elRect.width,
    height: elRect.height,
  };
}

function ensureOverlayLayer(container) {
  let layer = container.querySelector(".quill-image-overlay-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "quill-image-overlay-layer";
    container.appendChild(layer);
  }
  return layer;
}

function clearAlignStyles(img) {
  img.style.float = "";
  img.style.display = "";
  img.style.verticalAlign = "";
  img.style.marginLeft = "";
  img.style.marginRight = "";
  img.style.marginBottom = "";
  img.style.marginTop = "";
  const parent = img.parentElement;
  if (parent?.classList) {
    parent.classList.remove(
      "ql-align-left",
      "ql-align-center",
      "ql-align-right",
      "ql-align-justify",
      "quill-image-float-wrap"
    );
  }
}

export function setImageAlign(img, align) {
  clearAlignStyles(img);
  const parent = img.parentElement;

  if (align === "left") {
    img.style.float = "left";
    img.style.display = "";
    img.style.marginRight = "1rem";
    img.style.marginBottom = "0.5rem";
    parent?.classList?.add("ql-align-left", "quill-image-float-wrap");
  } else if (align === "right") {
    img.style.float = "right";
    img.style.display = "";
    img.style.marginLeft = "1rem";
    img.style.marginBottom = "0.5rem";
    parent?.classList?.add("ql-align-right", "quill-image-float-wrap");
  } else if (align === "inline") {
    img.style.display = "inline-block";
    img.style.verticalAlign = "top";
    img.style.marginRight = "0.5rem";
    img.style.marginBottom = "0.25rem";
    parent?.classList?.add("quill-image-float-wrap");
  } else if (align === "center") {
    img.style.display = "block";
    img.style.marginLeft = "auto";
    img.style.marginRight = "auto";
    img.style.marginBottom = "0.5rem";
    parent?.classList?.add("ql-align-center");
  }

  img.dataset.align = align;

  const blot = Quill.find(img);
  blot?.format?.("data-align", align);
  blot?.format?.("style", img.getAttribute("style"));
}

function setImageWidth(img, width) {
  const editorW = img.closest(".ql-editor")?.clientWidth || 800;
  const naturalW = img.naturalWidth || img.offsetWidth || 400;
  const naturalH = img.naturalHeight || img.offsetHeight || 300;
  const ratio = naturalH / naturalW || 0.75;

  if (typeof width === "string" && width.endsWith("%")) {
    const pct = parseFloat(width) / 100;
    const pxW = Math.round(editorW * pct);
    const pxH = Math.round(pxW * ratio);
    img.style.width = width;
    img.style.height = `${pxH}px`;
    img.setAttribute("width", String(pxW));
    img.setAttribute("height", String(pxH));
  } else {
    const pxW =
      typeof width === "number" ? width : parseInt(String(width), 10) || 200;
    const pxH = Math.round(pxW * ratio);
    img.style.width = `${pxW}px`;
    img.style.height = `${pxH}px`;
    img.setAttribute("width", String(pxW));
    img.setAttribute("height", String(pxH));
  }
  img.style.maxWidth = "100%";

  const blot = Quill.find(img);
  blot?.format?.("width", img.getAttribute("width"));
  blot?.format?.("height", img.getAttribute("height"));
  blot?.format?.("style", img.getAttribute("style"));
}

let activeState = null;

function hideImageTools() {
  if (!activeState) return;
  const {
    img,
    overlay,
    handles,
    onDocClick,
    onScroll,
    onResize,
    scrollEl,
    onImgMouseDown,
    quill,
  } = activeState;

  img?.classList.remove("quill-image-selected", "quill-image-dragging");
  if (img && onImgMouseDown) img.removeEventListener("mousedown", onImgMouseDown);
  overlay?.remove();
  handles?.forEach((h) => h.remove());

  document.removeEventListener("mousedown", onDocClick, true);
  if (scrollEl && onScroll) scrollEl.removeEventListener("scroll", onScroll);
  if (onResize) window.removeEventListener("resize", onResize);

  activeState = null;
}

function highlightActiveAlign(bar, align) {
  bar.querySelectorAll("[data-align]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.align === align);
  });
}

function createToolbar(img, quill, onSync, container) {
  const bar = document.createElement("div");
  bar.className = "quill-image-tools";
  bar.setAttribute("role", "toolbar");
  bar.innerHTML = `
    <span class="quill-image-tools-label">Image</span>
    <button type="button" data-align="left" title="Float left — text wraps on the right">Left</button>
    <button type="button" data-align="center" title="Center — image in the middle">Center</button>
    <button type="button" data-align="right" title="Float right — text wraps on the left">Right</button>
    <button type="button" data-align="inline" title="Inline — text beside on same line">Inline</button>
    <span class="quill-image-tools-sep" aria-hidden="true"></span>
    <button type="button" data-width="25%" title="25% width">S</button>
    <button type="button" data-width="50%" title="50% width">M</button>
    <button type="button" data-width="75%" title="75% width">L</button>
    <button type="button" data-width="100%" title="Full width">Full</button>
    <span class="quill-image-tools-hint">Drag to reposition</span>
  `;

  bar.addEventListener("mousedown", (e) => e.preventDefault());
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const { align, width } = btn.dataset;
    if (align) {
      setImageAlign(img, align);
      ensureParagraphAfterImage(img, quill);
      syncHtml(quill, onSync);
      highlightActiveAlign(bar, align);
    }
    if (width) {
      setImageWidth(img, width);
      syncHtml(quill, onSync);
    }
    positionImageUi(container);
  });

  highlightActiveAlign(bar, img.dataset.align || "center");
  return bar;
}

function createResizeHandles(layer) {
  return HANDLE_NAMES.map((name) => {
    const handle = document.createElement("span");
    handle.className = `quill-image-handle quill-image-handle-${name}`;
    handle.title = "Drag to resize";
    layer.appendChild(handle);
    return handle;
  });
}

function bindResizeHandles(handles, img, quill, onSync, container) {
  handles.forEach((handle) => {
    const handleName = [...handle.classList]
      .find((c) => c.startsWith("quill-image-handle-"))
      ?.replace("quill-image-handle-", "");

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!handleName) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const rect = img.getBoundingClientRect();
      const startW = rect.width;
      const startH = rect.height;
      const startMarginLeft = parseFloat(img.style.marginLeft) || 0;
      const maxW = img.closest(".ql-editor")?.clientWidth || 2000;
      const minSize = 40;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let newW = startW;
        let newH = startH;
        let marginLeft = startMarginLeft;

        switch (handleName) {
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

        newW = Math.max(minSize, Math.min(newW, maxW));
        newH = Math.max(minSize, newH);

        img.style.width = `${Math.round(newW)}px`;
        img.style.height = `${Math.round(newH)}px`;

        if (handleName === "w" || handleName === "sw" || handleName === "nw") {
          img.style.marginLeft =
            Math.abs(marginLeft) > 0.5 ? `${Math.round(marginLeft)}px` : "";
        }

        positionImageUi(container);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        commitImageSize(img);
        ensureParagraphAfterImage(img, quill);
        syncHtml(quill, onSync);
        positionImageUi(container);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });
}

function positionImageUi(container) {
  if (!activeState || !container) return;
  const { img, overlay, handles } = activeState;
  if (!img || !overlay) return;

  const { top, left, width, height } = getRelativeRect(img, container);
  const half = 7;

  overlay.style.top = `${Math.max(4, top - 42)}px`;
  overlay.style.left = `${Math.max(4, Math.min(left, container.clientWidth - 320))}px`;

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
      .find((c) => c.startsWith("quill-image-handle-"))
      ?.replace("quill-image-handle-", "");
    const pos = positions[name];
    if (!pos) return;
    handle.style.top = `${pos.top}px`;
    handle.style.left = `${pos.left}px`;
  });
}

const DRAG_THRESHOLD_PX = 4;

function getDropRange(quill, clientX, clientY, excludeImg = null) {
  let range = null;

  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(clientX, clientY);
  } else if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }

  if (!range || !quill.root.contains(range.startContainer)) return null;

  const hitImg =
    range.startContainer.nodeType === Node.ELEMENT_NODE &&
    range.startContainer.tagName === "IMG"
      ? range.startContainer
      : range.startContainer.parentElement?.closest?.("img");

  if (hitImg && hitImg === excludeImg) return null;

  const anchor =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer;
  if (anchor?.closest?.(".quill-image-overlay-layer")) return null;

  return range;
}

function getDropRangeFallback(quill, clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el || !quill.root.contains(el)) return null;

  let block = el.closest("p, li, h1, h2, h3, h4, h5, h6, blockquote");
  if (!block || block === quill.root) {
    let lastBlock = quill.root.querySelector("p:last-of-type");
    if (!lastBlock) {
      lastBlock = document.createElement("p");
      lastBlock.appendChild(document.createElement("br"));
      quill.root.appendChild(lastBlock);
    }
    block = lastBlock;
  }

  const fallback = document.createRange();
  fallback.selectNodeContents(block);
  fallback.collapse(false);
  return fallback;
}

function resolveDropRange(quill, clientX, clientY, excludeImg = null) {
  return (
    getDropRange(quill, clientX, clientY, excludeImg) ||
    getDropRangeFallback(quill, clientX, clientY)
  );
}

function showDropCaret(range) {
  try {
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    /* ignore invalid range */
  }
}

function moveImageToPoint(img, quill, clientX, clientY) {
  const range = resolveDropRange(quill, clientX, clientY, img);
  if (!range) return false;

  const savedStyle = img.getAttribute("style");
  const savedAlign = img.dataset.align;
  const savedW = img.getAttribute("width");
  const savedH = img.getAttribute("height");

  const oldParent = img.parentElement;
  img.remove();

  if (
    oldParent &&
    oldParent !== quill.root &&
    oldParent.tagName === "P" &&
    !oldParent.textContent.trim()
  ) {
    oldParent.remove();
  } else {
    oldParent?.normalize?.();
  }

  range.insertNode(img);

  if (savedStyle) img.setAttribute("style", savedStyle);
  if (savedAlign) img.dataset.align = savedAlign;
  if (savedW) img.setAttribute("width", savedW);
  if (savedH) img.setAttribute("height", savedH);

  return true;
}

function enablePointerDrag(img, quill, onSync, container) {
  img.draggable = false;
  img.style.cursor = "grab";

  const onImgMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".quill-image-handle")) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let dropRange = null;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

      if (!moved) {
        moved = true;
        img.classList.add("quill-image-dragging");
        if (activeState?.overlay) activeState.overlay.style.visibility = "hidden";
        if (activeState?.handles) {
          activeState.handles.forEach((h) => {
            h.style.visibility = "hidden";
          });
        }
      }

      dropRange = resolveDropRange(quill, ev.clientX, ev.clientY, img);
      if (dropRange) showDropCaret(dropRange);
    };

    const onUp = (ev) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      img.classList.remove("quill-image-dragging");

      if (activeState?.overlay) activeState.overlay.style.visibility = "";
      if (activeState?.handles) {
        activeState.handles.forEach((h) => {
          h.style.visibility = "";
        });
      }

      if (!moved) return;

      ev.preventDefault();
      ev.stopPropagation();

      const placed = moveImageToPoint(
        img,
        quill,
        ev.clientX,
        ev.clientY
      );

      if (placed) {
        commitImageSize(img);
        syncHtml(quill, onSync);
        requestAnimationFrame(() => positionImageUi(container));
      } else {
        positionImageUi(container);
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  img.addEventListener("mousedown", onImgMouseDown);

  return { onImgMouseDown };
}

function defaultNewImageLayout(img, quill) {
  if (img.dataset.align || img.style.float || img.style.display === "inline-block") {
    ensureParagraphAfterImage(img, quill);
    return;
  }
  setImageAlign(img, "center");
  ensureParagraphAfterImage(img, quill);
  requestAnimationFrame(() => placeCursorAfterImage(img, quill));
}

function showImageTools(img, quill, container, onSync) {
  if (!container) return;
  hideImageTools();

  const layer = ensureOverlayLayer(container);
  img.classList.add("quill-image-selected");

  const overlay = createToolbar(img, quill, onSync, container);
  layer.appendChild(overlay);

  const handles = createResizeHandles(layer);
  bindResizeHandles(handles, img, quill, onSync, container);

  const dragHandlers = enablePointerDrag(img, quill, onSync, container);

  const scrollEl = container.querySelector(".ql-container");
  const onScroll = () => positionImageUi(container);
  const onResize = () => positionImageUi(container);

  const onDocClick = (e) => {
    if (
      e.target === img ||
      img.contains(e.target) ||
      overlay.contains(e.target) ||
      handles.some((h) => h === e.target || h.contains(e.target))
    ) {
      return;
    }
    if (!handleClickBelowImage(e, quill, onSync)) {
      hideImageTools();
    }
  };

  if (scrollEl) scrollEl.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  activeState = {
    img,
    overlay,
    handles,
    onDocClick,
    onScroll,
    onResize,
    scrollEl,
    container,
    quill,
    onSync,
    onImgMouseDown: dragHandlers.onImgMouseDown,
  };

  positionImageUi(container);
  document.addEventListener("mousedown", onDocClick, true);
  requestAnimationFrame(() => positionImageUi(container));
}

export function attachImageEnhancer(quill, container, onSync) {
  if (!quill?.root || !container) return () => {};

  const onTextChange = (delta, _old, source) => {
    if (source !== "user") return;
    let changed = false;
    quill.root.querySelectorAll("img").forEach((img) => {
      if (!img.dataset.quillEnhanced) {
        img.dataset.quillEnhanced = "1";
        defaultNewImageLayout(img, quill);
        changed = true;
      }
    });
    if (changed) syncHtml(quill, onSync);
  };

  quill.on("text-change", onTextChange);

  const onEditorClick = (e) => {
    if (e.target.closest("img") || e.target.closest(".quill-image-tools")) return;
    handleClickBelowImage(e, quill, onSync);
  };

  const onClick = (e) => {
    const img = e.target.closest("img");
    if (img && quill.root.contains(img)) {
      e.preventDefault();
      e.stopPropagation();
      if (!img.dataset.quillEnhanced) {
        img.dataset.quillEnhanced = "1";
        defaultNewImageLayout(img, quill);
        syncHtml(quill, onSync);
      }
      showImageTools(img, quill, container, onSync);
      return;
    }
    if (
      !e.target.closest(".quill-image-tools") &&
      !e.target.closest(".quill-image-handle")
    ) {
      hideImageTools();
    }
  };

  quill.root.addEventListener("click", onEditorClick);
  quill.root.addEventListener("click", onClick, true);

  quill.root.querySelectorAll("img").forEach((img) => {
    img.dataset.quillEnhanced = "1";
    if (img.dataset.align) {
      setImageAlign(img, img.dataset.align);
    } else if (img.getAttribute("style")?.includes("float")) {
      const float = img.style.float;
      setImageAlign(img, float === "right" ? "right" : "left");
    } else {
      setImageAlign(img, "center");
    }
    ensureParagraphAfterImage(img, quill);
  });

  return () => {
    quill.off("text-change", onTextChange);
    quill.root.removeEventListener("click", onEditorClick);
    quill.root.removeEventListener("click", onClick, true);
    window.removeEventListener("resize", activeState?.onResize);
    hideImageTools();
  };
}

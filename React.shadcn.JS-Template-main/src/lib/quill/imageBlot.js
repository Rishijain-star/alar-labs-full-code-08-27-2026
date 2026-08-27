import Quill from "quill";

let registered = false;

/**
 * Quill Image blot that preserves width, height, inline style, and data-align
 * so resized / floated images survive HTML round-trips.
 */
export function registerQuillImageBlot() {
  if (registered) return;
  registered = true;

  const BaseImage = Quill.import("formats/image");

  class ResizableImage extends BaseImage {
    static blotName = "image";
    static tagName = "IMG";

    static create(value) {
      const src = typeof value === "string" ? value : value?.src;
      const node = super.create(src);
      node.setAttribute("contenteditable", "false");

      if (typeof value === "object" && value) {
        applyPersistedImageState(node, value);
      }
      return node;
    }

    static formats(domNode) {
      const formats = super.formats(domNode) || {};
      const style = domNode.getAttribute("style");
      if (style) formats.style = style;
      if (domNode.dataset.align) formats["data-align"] = domNode.dataset.align;
      return formats;
    }

    static value(domNode) {
      return domNode.getAttribute("src");
    }

    format(name, value) {
      if (name === "style") {
        if (value) this.domNode.setAttribute("style", value);
        else this.domNode.removeAttribute("style");
      } else if (name === "data-align") {
        if (value) this.domNode.dataset.align = value;
        else delete this.domNode.dataset.align;
      } else {
        super.format(name, value);
      }
    }
  }

  Quill.register(ResizableImage, true);
}

export function applyPersistedImageState(img, state = {}) {
  if (!img) return;

  if (state.width) {
    const w = String(state.width).replace(/px$/, "");
    img.setAttribute("width", w);
    if (!state.style?.includes("width")) {
      img.style.width = /%$/.test(String(state.width))
        ? state.width
        : `${w}px`;
    }
  }
  if (state.height) {
    const h = String(state.height).replace(/px$/, "");
    img.setAttribute("height", h);
    if (!state.style?.includes("height")) {
      img.style.height = `${h}px`;
    }
  }
  if (state.style) img.setAttribute("style", state.style);
  if (state.align) img.dataset.align = state.align;
}

export function commitImageSize(img) {
  if (!img) return;

  const w = Math.round(img.offsetWidth);
  const h = Math.round(img.offsetHeight);
  if (w < 1 || h < 1) return;

  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.setAttribute("width", String(w));
  img.setAttribute("height", String(h));
  img.style.maxWidth = "100%";

  const blot = Quill.find(img);
  if (blot?.format) {
    blot.format("width", String(w));
    blot.format("height", String(h));
    blot.format("style", img.getAttribute("style"));
    if (img.dataset.align) blot.format("data-align", img.dataset.align);
  }
}

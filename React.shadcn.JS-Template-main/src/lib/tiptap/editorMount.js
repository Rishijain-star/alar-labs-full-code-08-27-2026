/**
 * Safe access to TipTap editor view/DOM — avoids crashes when the view
 * is not mounted yet or the editor was destroyed (e.g. sidebar remounts).
 */

export function safeEditorView(editor) {
  if (!editor || editor.isDestroyed) return null;
  try {
    return editor.view ?? null;
  } catch {
    return null;
  }
}

export function safeEditorDom(editor) {
  return safeEditorView(editor)?.dom ?? null;
}

/**
 * Run `fn` once the editor ProseMirror view is mounted. Returns cleanup.
 * @param {import('@tiptap/core').Editor | null} editor
 * @param {(dom: HTMLElement, editor: import('@tiptap/core').Editor) => (() => void) | void} fn
 */
export function whenEditorDomReady(editor, fn) {
  if (!editor) return () => {};

  let disposed = false;
  let innerCleanup = null;

  const run = () => {
    if (disposed || editor.isDestroyed) return;
    const dom = safeEditorDom(editor);
    if (!dom) return;
    innerCleanup?.();
    innerCleanup = fn(dom, editor) || null;
  };

  if (safeEditorDom(editor)) {
    run();
  } else {
    editor.on("create", run);
    requestAnimationFrame(run);
  }

  return () => {
    disposed = true;
    editor.off("create", run);
    innerCleanup?.();
    innerCleanup = null;
  };
}

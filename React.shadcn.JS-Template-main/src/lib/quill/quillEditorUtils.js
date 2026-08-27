/** Reliable Quill instance from a ReactQuill ref (avoids getEditor throw). */
export function getQuillFromReactRef(reactQuillRef) {
  const instance = reactQuillRef?.current;
  if (!instance) return null;
  if (instance.editor) return instance.editor;
  try {
    return instance.getEditor?.() ?? null;
  } catch {
    return null;
  }
}

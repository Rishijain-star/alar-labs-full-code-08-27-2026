/**
 * Hierarchical lab outline: Section → Task → Step → subSteps + blocks.
 * Flattened to runner "sections" for LabDetail.
 */

export function uid() {
  return `id_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function defaultLabOutline() {
  return {
    version: 2,
    sections: [
      {
        id: uid(),
        title: "Section 1",
        blocks: [],
        tasks: [
          {
            id: uid(),
            title: "Task 1",
            anchorId: "task-1",
            blocks: [],
            noteAfter: null,
            steps: [
              {
                id: uid(),
                title: "Step 1",
                stepNumber: 1,
                anchorId: "step-1",
                blocks: [],
                subSteps: [],
                noteAfter: null,
              },
            ],
          },
        ],
      },
    ],
  };
}

function normalizeBlock(b) {
  if (!b || typeof b !== "object") return null;
  return { ...b };
}

/**
 * Flatten labOutline tree → ordered API-shaped sections (then pass through mapApiLabToRunner.normalizeSection).
 */
export function flattenLabOutlineToRunnerSections(outline) {
  const out = [];
  if (!outline?.sections?.length) return out;

  for (const sec of outline.sections) {
    if (sec.title?.trim()) {
      out.push({
        type: "heading",
        id: sec.id,
        text: sec.title.trim(),
        level: "normal",
      });
    }
    for (const b of sec.blocks || []) {
      const nb = normalizeBlock(b);
      if (nb) out.push(nb);
    }
    for (const task of sec.tasks || []) {
      if (task.title?.trim()) {
        out.push({
          type: "heading",
          id: task.anchorId || task.id,
          text: task.title.trim(),
          level: "task",
        });
      }
      for (const b of task.blocks || []) {
        const nb = normalizeBlock(b);
        if (nb) out.push(nb);
      }
      if (task.noteAfter?.html?.trim()) {
        out.push({
          type: "note_box",
          id: `${task.id}-note`,
          html: task.noteAfter.html,
          backgroundColor: task.noteAfter.backgroundColor || "#fef9c3",
        });
      }

      let sn = 1;
      for (const step of task.steps || []) {
        const content = [];
        for (const b of step.blocks || []) {
          const nb = normalizeBlock(b);
          if (nb) content.push(nb);
        }
        const subSteps = (step.subSteps || []).map((ss) => ({
          id: ss.id,
          title: ss.title || "",
          content: (ss.blocks || []).map(normalizeBlock).filter(Boolean),
        }));

        out.push({
          type: "step",
          anchorId: step.anchorId || step.id,
          id: step.id,
          stepNumber: step.stepNumber ?? sn,
          title: step.title || "",
          blocks: content,
          subSteps,
        });

        if (step.noteAfter?.html?.trim()) {
          out.push({
            type: "note_box",
            id: `${step.id}-note`,
            html: step.noteAfter.html,
            backgroundColor: step.noteAfter.backgroundColor || "#e0f2fe",
          });
        }
        sn++;
      }
    }
  }

  return out;
}

/** Walk outline; invoke fn(block, path) for each block (for media upload). */
export function walkOutlineBlocks(outline, fn) {
  if (!outline?.sections) return;
  for (const sec of outline.sections) {
    for (const b of sec.blocks || []) {
      fn(b, { sectionId: sec.id, taskId: null, stepId: null, subStepId: null });
    }
    for (const task of sec.tasks || []) {
      for (const b of task.blocks || []) {
        fn(b, { sectionId: sec.id, taskId: task.id, stepId: null, subStepId: null });
      }
      for (const step of task.steps || []) {
        const path = { sectionId: sec.id, taskId: task.id, stepId: step.id };
        for (const b of step.blocks || []) {
          fn(b, { ...path, subStepId: null });
        }
        for (const ss of step.subSteps || []) {
          for (const b of ss.blocks || []) {
            fn(b, { ...path, subStepId: ss.id });
          }
        }
      }
    }
  }
}

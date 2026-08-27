function parseMetadata(raw) {
  if (raw == null) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function resolveLabKind(lab) {
  if (!lab) return "hands_on";
  const meta = parseMetadata(lab.metadata);
  if (meta.lab_kind) return meta.lab_kind;
  if (lab.lab_kind) return lab.lab_kind;
  if (lab.type === "assessment") return "skill_builder";
  return "hands_on";
}

module.exports = { parseMetadata, resolveLabKind };

/** Helpers for Technology Readiness Assessment wizard config. */

export function getSpecializationsForInterest(config, primaryPath) {
  if (!config || !primaryPath) return [];
  return config.specializationsByPath?.[primaryPath] || [];
}

export function findSpecialization(config, primaryPath, specializationId) {
  return getSpecializationsForInterest(config, primaryPath).find(
    (s) => s?.id === specializationId,
  );
}

/**
 * Step 3 options for the selected specialization (cascading from step 1 → 2 → 3).
 * Falls back to legacy global cloudOptions when per-track options are missing.
 */
export function getStep3Options(config, primaryPath, specializationId) {
  if (!config || !specializationId) return [];

  const spec = findSpecialization(config, primaryPath, specializationId);
  if (Array.isArray(spec?.step3Options) && spec.step3Options.length > 0) {
    return spec.step3Options;
  }

  const legacyPerSpec = config.cloudOptionsBySpecialization?.[specializationId];
  if (Array.isArray(legacyPerSpec) && legacyPerSpec.length > 0) {
    return legacyPerSpec;
  }

  if (Array.isArray(config.cloudOptions) && config.cloudOptions.length > 0) {
    return config.cloudOptions;
  }

  return [];
}

export function getStep3OptionLabel(config, primaryPath, specializationId, optionId) {
  const options = getStep3Options(config, primaryPath, specializationId);
  const hit = options.find((o) => o.id === optionId);
  if (hit?.label) return hit.label;
  if (optionId && !/^opt-\d+$/i.test(String(optionId))) {
    return String(optionId)
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return "";
}

/** Auto skills/tools/certifications from track + focus labels (no manual admin entry). */
export function suggestOutcomeForSpecialization(trackLabel = "", focusLabel = "") {
  const text = `${trackLabel} ${focusLabel}`.toLowerCase();
  const careerTitle = focusLabel
    ? `${focusLabel}`
    : trackLabel
      ? `${trackLabel} Specialist`
      : "IT Specialist";

  if (/mysql|mariadb/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "MySQL"} Specialist`,
      skills: ["SQL", "MySQL", "Database design", "Backup & recovery", "Query tuning"],
      tools: ["MySQL Workbench", "phpMyAdmin", "DBeaver"],
      certificationTitles: ["MySQL Database Administrator"],
    };
  }
  if (/\bsql\b|t-sql|tsql/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "SQL"} Specialist`,
      skills: ["SQL", "Query optimization", "Stored procedures", "Reporting", "Data modeling"],
      tools: ["SQL Server Management Studio", "Azure Data Studio", "DBeaver"],
      certificationTitles: ["Microsoft SQL Server"],
    };
  }
  if (/oracle|pl\/sql|plsql/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "Oracle"} Specialist`,
      skills: ["SQL", "PL/SQL", "Oracle Database", "Performance tuning", "RAC basics"],
      tools: ["SQL Developer", "Oracle Enterprise Manager", "Toad"],
      certificationTitles: ["Oracle Database Administrator"],
    };
  }
  if (/database|dba|data admin/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "Database"} Specialist`,
      skills: ["SQL", "Database administration", "Backup & recovery", "Security", "High availability"],
      tools: ["DBeaver", "pgAdmin", "MySQL Workbench"],
      certificationTitles: ["Database Administrator"],
    };
  }
  if (/aws|amazon web/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "AWS"} Specialist`,
      skills: ["AWS", "EC2", "S3", "IAM", "Cloud architecture"],
      tools: ["AWS Console", "AWS CLI", "CloudFormation"],
      certificationTitles: ["AWS Solutions Architect"],
    };
  }
  if (/azure/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "Azure"} Specialist`,
      skills: ["Azure", "Virtual machines", "Azure AD", "Networking", "Storage"],
      tools: ["Azure Portal", "Azure CLI", "ARM templates"],
      certificationTitles: ["Azure Administrator"],
    };
  }
  if (/kubernetes|k8s|container/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "Kubernetes"} Specialist`,
      skills: ["Kubernetes", "Docker", "Helm", "CI/CD", "Linux"],
      tools: ["kubectl", "Lens", "Git"],
      certificationTitles: ["CKA", "CKAD"],
    };
  }
  if (/devops|ci\/cd|cicd/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "DevOps"} Specialist`,
      skills: ["CI/CD", "Docker", "Linux", "Infrastructure as code", "Monitoring"],
      tools: ["Git", "Jenkins", "Terraform", "Docker"],
      certificationTitles: ["AWS DevOps Engineer"],
    };
  }
  if (/security|cyber|penetration|ethical/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "Security"} Specialist`,
      skills: ["Network security", "Threat analysis", "IAM", "Compliance", "Incident response"],
      tools: ["Wireshark", "Nmap", "SIEM tools"],
      certificationTitles: ["Security+", "CEH"],
    };
  }
  if (/web|react|frontend|full stack|fullstack|node/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "Web"} Developer`,
      skills: ["HTML", "CSS", "JavaScript", "React", "REST APIs"],
      tools: ["VS Code", "Git", "Chrome DevTools", "Postman"],
      certificationTitles: [],
    };
  }
  if (/python|java|backend|programming|software/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "Software"} Developer`,
      skills: ["Programming fundamentals", "APIs", "Git", "Debugging", "Testing"],
      tools: ["VS Code", "Git", "Docker"],
      certificationTitles: [],
    };
  }
  if (/data science|machine learning|ml|ai|analytics/.test(text)) {
    return {
      careerTitle: focusLabel || `${trackLabel || "Data"} Specialist`,
      skills: ["Python", "Statistics", "Machine learning", "Data visualization", "SQL"],
      tools: ["Jupyter", "Pandas", "Power BI", "Python"],
      certificationTitles: [],
    };
  }

  const base = trackLabel || focusLabel || "IT";
  return {
    careerTitle,
    skills: [base, "Problem solving", "Documentation", "Team collaboration"].filter(Boolean),
    tools: ["VS Code", "Git", "Terminal"],
    certificationTitles: [],
  };
}

export function slugifyOptionId(label, index = 0) {
  const slug = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `option-${index}`;
}

export function labelsToStep3Options(text) {
  return String(text || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: slugifyOptionId(label, i), label }));
}

export function step3OptionsToComma(options = []) {
  return (Array.isArray(options) ? options : [])
    .map((o) => o?.label)
    .filter(Boolean)
    .join(", ");
}

export function fromCommaList(text) {
  return String(text || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toCommaList(items = []) {
  return (Array.isArray(items) ? items : []).filter(Boolean).join(", ");
}

/** Display value for comma-separated admin inputs (keeps raw text while typing). */
export function commaFieldDisplay(raw, arrayFallback = []) {
  if (typeof raw === "string") return raw;
  if (Array.isArray(arrayFallback) && arrayFallback.length > 0) {
    const first = arrayFallback[0];
    if (first && typeof first === "object" && "label" in first) {
      return step3OptionsToComma(arrayFallback);
    }
  }
  return toCommaList(arrayFallback);
}

/** Step 3 options text for admin input. */
export function step3FieldDisplay(track = {}) {
  if (typeof track.step3Text === "string") return track.step3Text;
  return step3OptionsToComma(track.step3Options);
}

/** Skills/tools text for admin input. */
export function listFieldDisplay(raw) {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    if (raw.length > 0 && typeof raw[0] === "object") {
      return step3OptionsToComma(raw);
    }
    return toCommaList(raw);
  }
  return "";
}

/** Drop wizard selections that no longer exist in the published config. */
export function sanitizeAssessmentSelections(config, selections = {}) {
  if (!config || !selections) return {};
  const next = { ...selections };
  const interests = config.primaryInterests || [];

  if (next.primaryPath && !interests.some((i) => i.id === next.primaryPath)) {
    delete next.primaryPath;
    delete next.specialization;
    delete next.cloudPreference;
    return next;
  }

  if (next.specialization) {
    const spec = findSpecialization(config, next.primaryPath, next.specialization);
    if (!spec) {
      delete next.specialization;
      delete next.cloudPreference;
      return next;
    }
  }

  if (next.cloudPreference && next.specialization) {
    const opts = getStep3Options(config, next.primaryPath, next.specialization);
    if (!opts.some((o) => o.id === next.cloudPreference)) {
      delete next.cloudPreference;
    }
  }

  return next;
}

/** Normalize track fields before saving (parse comma text → arrays). */
export function normalizeTrackForSave(track = {}) {
  const step3Options =
    typeof track.step3Text === "string"
      ? labelsToStep3Options(track.step3Text)
      : track.step3Options || [];
  const skills =
    typeof track.skills === "string" ? fromCommaList(track.skills) : track.skills || [];
  const tools =
    typeof track.tools === "string" ? fromCommaList(track.tools) : track.tools || [];
  const { step3Text, ...rest } = track;
  return { ...rest, step3Options, skills, tools };
}

export function normalizeAssessmentConfigForSave(config = {}) {
  const byPath = {};
  for (const [interestId, specs] of Object.entries(config.specializationsByPath || {})) {
    byPath[interestId] = (specs || []).map(normalizeTrackForSave);
  }
  return { ...config, specializationsByPath: byPath };
}

/** Read skills/tools/certs stored on the track, or infer from its label. */
export function getOutcomeForSpecialization(config, primaryPath, specializationId, focusLabel = "") {
  const spec = findSpecialization(config, primaryPath, specializationId);
  const suggested = suggestOutcomeForSpecialization(spec?.label || "", focusLabel);
  return {
    careerTitle: suggested.careerTitle,
    skills: Array.isArray(spec?.skills) && spec.skills.length ? spec.skills : suggested.skills,
    tools: Array.isArray(spec?.tools) && spec.tools.length ? spec.tools : suggested.tools,
    certificationIds: Array.isArray(spec?.certificationIds) ? spec.certificationIds : [],
    certificationTitles:
      Array.isArray(spec?.certificationTitles) && spec.certificationTitles.length
        ? spec.certificationTitles
        : suggested.certificationTitles,
  };
}

/** True when every track has at least one step-3 option (ready to publish). */
export function validateAssessmentConfig(config) {
  const interests = config?.primaryInterests || [];
  const issues = [];

  if (interests.length === 0) {
    issues.push("Add at least one career topic.");
  }

  for (const interest of interests) {
    const tracks = config.specializationsByPath?.[interest.id] || [];
    if (tracks.length === 0) {
      issues.push(`Topic "${interest.label || "Untitled"}" needs at least one track.`);
      continue;
    }
    for (const track of tracks) {
      const opts = getStep3Options(config, interest.id, track.id);
      if (opts.length === 0) {
        issues.push(
          `Track "${track.label || "Untitled"}" under "${interest.label || "topic"}" needs step 3 options.`,
        );
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

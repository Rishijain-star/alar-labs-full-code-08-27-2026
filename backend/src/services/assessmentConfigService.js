const { Op } = require("sequelize");
const { AssessmentConfig, Course, Lab, Certification } = require("../models");
const { AppError } = require("../middleware/errorHandler");

function titleCaseFromId(id = "") {
  return String(id)
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function defaultOutcome(specId) {
  const t = titleCaseFromId(specId);
  return {
    careerTitle: `${t || "IT"} Specialist`,
    skills: ["Linux", "Docker", "Kubernetes", "Terraform", "CI/CD"],
    tools: ["VS Code", "Git", "Jenkins", "Ansible", "Prometheus"],
    certificationTitles: ["AWS Solutions Architect", "CKA", "Terraform Associate"],
    recommendedCourseIds: [],
    recommendedLabIds: [],
  };
}

function resolveStep3Label(config, primaryPath, specializationId, optionId) {
  const searchIn = (specs) => {
    const spec = (specs || []).find((s) => s && s.id === specializationId);
    const options = spec?.step3Options || config.cloudOptionsBySpecialization?.[specializationId] || [];
    if (!Array.isArray(options)) return null;
    const hit = options.find((o) => o.id === optionId);
    return hit?.label || null;
  };

  if (primaryPath) {
    const label = searchIn(config.specializationsByPath?.[primaryPath]);
    if (label) return label;
  }

  for (const specs of Object.values(config.specializationsByPath || {})) {
    const label = searchIn(specs);
    if (label) return label;
  }

  return null;
}

function suggestOutcomeForSpecialization(trackLabel = "", focusLabel = "") {
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

function cloudLabel(cloud, config, primaryPath, specialization) {
  const fromConfig =
    config && specialization
      ? resolveStep3Label(config, primaryPath, specialization, cloud)
      : null;
  if (fromConfig) return fromConfig;
  if (!cloud || cloud === "not-now") return null;
  if (/^opt-\d+$/i.test(String(cloud))) return null;
  const m = { aws: "AWS", azure: "Azure", gcp: "GCP", multi: "Multi-Cloud" };
  if (m[cloud]) return m[cloud];
  return titleCaseFromId(cloud);
}

function asStringArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function getDefaultConfig() {
  return {
    primaryInterests: [
      { id: "it-administration", label: "IT Administration & Operations", icon: "Server" },
      { id: "programming", label: "Programming / Software Development", icon: "Code" },
      { id: "cloud-devops", label: "Cloud & DevOps Engineering", icon: "Cloud" },
      { id: "security", label: "Cybersecurity", icon: "Shield" },
      { id: "data-ai", label: "Data, AI & Analytics", icon: "Database" },
      { id: "networking", label: "Networking & Infrastructure", icon: "Network" },
      { id: "qa-testing", label: "QA / Testing & Automation", icon: "TestTube" },
      { id: "not-sure", label: "Not Sure (Guide Me)", icon: "HelpCircle" }
    ],
    specializationsByPath: {
      "it-administration": [
        { id: "windows-admin", label: "Windows Administration" },
        { id: "linux-admin", label: "Linux Administration" },
        { id: "hybrid-admin", label: "Hybrid (Windows + Linux)" },
        { id: "cloud-admin", label: "Cloud Administration" },
        { id: "end-user-admin", label: "End-User / EUC Administration" }
      ],
      "programming": [
        { id: "web-dev", label: "Web Development (Full Stack)" },
        { id: "frontend", label: "Frontend Development" },
        { id: "backend", label: "Backend Development" },
        { id: "mobile-dev", label: "Mobile App Development" },
        { id: "game-dev", label: "Game Development" }
      ],
      "cloud-devops": [
        { id: "aws-devops", label: "AWS DevOps" },
        { id: "azure-devops", label: "Azure DevOps" },
        { id: "gcp-devops", label: "GCP DevOps" },
        { id: "sre", label: "Site Reliability Engineering (SRE)" },
        { id: "kubernetes", label: "Kubernetes & Containerization" }
      ],
      "security": [
        { id: "pen-testing", label: "Penetration Testing & Ethical Hacking" },
        { id: "secops", label: "SecOps / Security Operations" },
        { id: "compliance", label: "Compliance & Risk Management" },
        { id: "network-security", label: "Network Security" },
        { id: "cloud-security", label: "Cloud Security" }
      ],
      "data-ai": [
        { id: "data-engineering", label: "Data Engineering" },
        { id: "data-science", label: "Data Science & Machine Learning" },
        { id: "data-analytics", label: "Data Analytics & BI" },
        { id: "ai-ml", label: "AI & Machine Learning Engineering" },
        { id: "big-data", label: "Big Data Technologies" }
      ],
      "networking": [
        { id: "network-engineering", label: "Network Engineering" },
        { id: "cloud-networking", label: "Cloud Networking" },
        { id: "sd-wan", label: "SD-WAN & Enterprise Networking" },
        { id: "wireless", label: "Wireless Networking" }
      ],
      "qa-testing": [
        { id: "automation-testing", label: "Test Automation" },
        { id: "manual-testing", label: "Manual QA Testing" },
        { id: "performance-testing", label: "Performance Testing" },
        { id: "security-testing", label: "Security Testing" }
      ],
      "not-sure": [
        { id: "general-it", label: "General IT (Explore All Paths)" }
      ]
    },
    cloudOptions: [
      { id: "aws", label: "AWS" },
      { id: "azure", label: "Azure" },
      { id: "gcp", label: "GCP" },
      { id: "multi", label: "Multi-Cloud" },
      { id: "not-now", label: "Not now" }
    ],
    outcomesBySpecialization: {
      default: defaultOutcome("default")
    }
  };
}

async function ensureRow() {
  const [row] = await AssessmentConfig.findOrCreate({
    where: { config_key: "technology_readiness" },
    defaults: {
      config: getDefaultConfig(),
      is_published: true,
    },
  });
  return row;
}

/**
 * MySQL JSON columns can come back as a string (double-encoded / dialect quirk).
 * Always hand callers a parsed object so the frontend never sees a JSON string.
 */
function normalizeConfigRow(row) {
  const obj = typeof row?.toJSON === "function" ? row.toJSON() : { ...row };
  if (typeof obj.config === "string") {
    try {
      obj.config = JSON.parse(obj.config);
    } catch {
      obj.config = {};
    }
  }
  return obj;
}

class AssessmentConfigService {
  async getPublishedConfig() {
    const row = await AssessmentConfig.findOne({
      where: { config_key: "technology_readiness", is_published: true },
    });
    if (!row) throw new AppError("Assessment not available", 404);
    return normalizeConfigRow(row);
  }

  async getAdminConfig() {
    const row = await ensureRow();
    return normalizeConfigRow(row);
  }

  /**
   * Whether the config has been intentionally created/saved by an admin at least
   * once (vs. the auto-seeded default row). Drives the create-vs-edit permission
   * split: a not-yet-initialized config requires `create_programs`, an existing
   * one requires `edit_programs`.
   */
  async isInitialized() {
    const row = await AssessmentConfig.findOne({
      where: { config_key: "technology_readiness" },
    });
    return !!(row && row.is_initialized);
  }

  async upsertConfig(payload, userId) {
    const row = await ensureRow();
    const { config, is_published } = payload || {};

    if (config !== undefined && typeof config === "object" && config !== null) {
      row.config = config;
    }
    if (typeof is_published === "boolean") {
      row.is_published = is_published;
    }
    if (userId) {
      row.updated_by = userId;
    }
    // First successful save marks the config as created so subsequent saves are
    // treated as edits by the permission layer.
    row.is_initialized = true;

    await row.save();
    return normalizeConfigRow(row);
  }

  /**
   * Resolve recommended course/lab ids to lightweight, published summaries the
   * public result page can render and link to.
   */
  async _resolveRecommendedContent(courseIds = [], labIds = []) {
    const cIds = Array.isArray(courseIds) ? courseIds.filter(Boolean) : [];
    const lIds = Array.isArray(labIds) ? labIds.filter(Boolean) : [];

    const [courseRows, labRows] = await Promise.all([
      cIds.length
        ? Course.findAll({
            where: { id: { [Op.in]: cIds }, status: "published" },
            attributes: ["id", "title", "slug", "thumbnail", "level", "duration_minutes"],
          })
        : [],
      lIds.length
        ? Lab.findAll({
            where: { id: { [Op.in]: lIds }, status: "published" },
            attributes: ["id", "title", "slug", "thumbnail", "difficulty"],
          })
        : [],
    ]);

    // Preserve the admin-defined ordering.
    const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
    const courseMap = byId(courseRows);
    const labMap = byId(labRows);

    const courses = cIds
      .map((id) => courseMap.get(id))
      .filter(Boolean)
      .map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        thumbnail: r.thumbnail || null,
        level: r.level || null,
        durationMinutes: r.duration_minutes || 0,
      }));

    const labs = lIds
      .map((id) => labMap.get(id))
      .filter(Boolean)
      .map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        thumbnail: r.thumbnail || null,
        difficulty: r.difficulty || null,
      }));

    return { courses, labs };
  }

  /**
   * Build a keyword set from an outcome's skills/tools + the specialization,
   * used to auto-match catalog courses/labs.
   */
  _collectKeywords({ skills = [], tools = [], specializationLabel = "", specialization = "" } = {}) {
    const set = new Set();
    const addPhrase = (s) => {
      const v = String(s || "").trim().toLowerCase();
      if (v) set.add(v);
    };
    const addTokens = (s) => {
      String(s || "")
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((t) => t && t.length > 1)
        .forEach((t) => set.add(t));
    };
    [...(Array.isArray(skills) ? skills : []), ...(Array.isArray(tools) ? tools : [])].forEach(
      (s) => {
        addPhrase(s);
        addTokens(s);
      }
    );
    addTokens(specializationLabel);
    addTokens(specialization);
    // Drop a few generic tokens that would over-match.
    ["and", "the", "with", "for", "your", "not", "now"].forEach((t) => set.delete(t));
    return [...set];
  }

  _scoreItem(item, keywords) {
    const tags = Array.isArray(item.tags) ? item.tags.map((t) => String(t).toLowerCase()) : [];
    const title = String(item.title || "").toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (tags.includes(kw)) score += 3;
      else if (tags.some((t) => t.includes(kw) || kw.includes(t))) score += 2;
      else if (title.includes(kw)) score += 1;
    }
    return score;
  }

  /**
   * Auto-match published courses & labs by relevance to the given keywords.
   * Returns the top `limit` of each, highest score first.
   */
  async _autoMatchContent(keywords, limit = 6) {
    if (!Array.isArray(keywords) || !keywords.length) return { courses: [], labs: [] };

    const [courseRows, labRows] = await Promise.all([
      Course.findAll({
        where: { status: "published" },
        attributes: ["id", "title", "slug", "thumbnail", "level", "duration_minutes", "tags"],
        limit: 300,
      }),
      Lab.findAll({
        where: { status: "published" },
        attributes: ["id", "title", "slug", "thumbnail", "difficulty", "tags"],
        limit: 300,
      }),
    ]);

    const rank = (rows, mapper) =>
      rows
        .map((r) => ({ r, s: this._scoreItem(r, keywords) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map((x) => mapper(x.r));

    const courses = rank(courseRows, (r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      thumbnail: r.thumbnail || null,
      level: r.level || null,
      durationMinutes: r.duration_minutes || 0,
    }));
    const labs = rank(labRows, (r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      thumbnail: r.thumbnail || null,
      difficulty: r.difficulty || null,
    }));

    return { courses, labs };
  }

  /** Admin preview: same matcher the public recommendation uses. */
  async previewAutoRecommend({ skills = [], tools = [], specialization = "", specializationLabel = "" } = {}) {
    const keywords = this._collectKeywords({ skills, tools, specialization, specializationLabel });
    return this._autoMatchContent(keywords);
  }

  /** POST body: { primaryPath, specialization, cloudPreference } */
  async recommendFromDb(body = {}) {
    const { specialization } = body || {};
    if (!specialization) {
      throw new AppError("specialization is required", 400);
    }
    const row = await AssessmentConfig.findOne({
      where: { config_key: "technology_readiness", is_published: true },
    });
    if (!row) throw new AppError("Assessment not available", 404);
    const normalized = normalizeConfigRow(row);
    return this._recommendWithConfig(body, normalized.config || {});
  }

  /** Find full specialization track from config. */
  _findSpecialization(config, specialization) {
    const byPath = (config && config.specializationsByPath) || {};
    for (const specs of Object.values(byPath)) {
      if (!Array.isArray(specs)) continue;
      const hit = specs.find((s) => s && s.id === specialization);
      if (hit) return hit;
    }
    return null;
  }

  /** Find a specialization's display label from the config (for keyword matching). */
  _specializationLabel(config, specialization) {
    return this._findSpecialization(config, specialization)?.label || "";
  }

  async _resolveCertifications(certificationIds = []) {
    if (!Array.isArray(certificationIds) || certificationIds.length === 0) return [];
    const rows = await Certification.findAll({
      where: { id: certificationIds, is_active: true },
      attributes: ["id", "title", "vendor_platform", "level"],
      order: [["sort_order", "ASC"], ["title", "ASC"]],
    });
    const byId = Object.fromEntries(rows.map((r) => [String(r.id), r]));
    return certificationIds
      .map((id) => byId[String(id)])
      .filter(Boolean)
      .map((r) => ({
        id: r.id,
        title: r.title,
        vendorPlatform: r.vendor_platform || null,
        level: r.level || null,
      }));
  }

  async _recommendWithConfig(body, config) {
    const { primaryPath, specialization, cloudPreference } = body;
    const spec = this._findSpecialization(config, specialization);
    const trackLabel = (spec?.label || this._specializationLabel(config, specialization) || "").trim();
    const focusLabel = resolveStep3Label(config, primaryPath, specialization, cloudPreference) || "";
    const suggested = suggestOutcomeForSpecialization(trackLabel, focusLabel);

    const skills = asStringArray(spec?.skills);
    const tools = asStringArray(spec?.tools);
    const finalSkills = skills.length ? skills : suggested.skills;
    const finalTools = tools.length ? tools : suggested.tools;

    const certIds = Array.isArray(spec?.certificationIds) ? spec.certificationIds : [];
    let certifications;
    if (certIds.length > 0) {
      certifications = await this._resolveCertifications(certIds);
    } else if (Array.isArray(spec?.certificationTitles) && spec.certificationTitles.length) {
      certifications = spec.certificationTitles.map((title) => ({ id: null, title }));
    } else {
      certifications = (suggested.certificationTitles || []).map((title) => ({ id: null, title }));
    }

    const careerTitle = focusLabel
      ? `${focusLabel} Specialist`
      : trackLabel
        ? `${trackLabel} Specialist`
        : suggested.careerTitle;

    const { courses, labs } = await this._autoMatchContent(
      this._collectKeywords({
        skills: finalSkills,
        tools: finalTools,
        specialization,
        specializationLabel: focusLabel || trackLabel,
      }),
    );

    return {
      careerTitle,
      skills: finalSkills,
      tools: finalTools,
      certifications,
      focus: focusLabel || null,
      cloudPlatform: cloudLabel(cloudPreference, config, primaryPath, specialization),
      courses,
      labs,
    };
  }
}

module.exports = new AssessmentConfigService();

const BaseRepository = require("./baseRepository");
const { Lab, LabQuestion, LabAssignment, Course, Certification } = require("../models");

class LabRepository extends BaseRepository {
    constructor() {
        super(Lab, "lab", 1800);
    }

    // ── Slug ──────────────────────────────────────────────────────────────────

    async findBySlug(slug) {
        const key = `lab:slug:${slug}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await Lab.findOne({
            where: { slug },
            include: [
                {
                    model: Certification,
                    as: "certification",
                    attributes: ["id", "title"],
                    required: false,
                },
                {
                    model: Course,
                    as: "course",
                    attributes: ["id", "title", "slug", "status"],
                    required: false,
                },
            ],
        });
        if (!record) return null;
        const data = record.toJSON();
        await this._set(key, data, this.ttl);
        return data;
    }

    // ── Full lab (admin view) ─────────────────────────────────────────────────

    async findByIdFull(id) {
        const key = `lab:full:${id}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await Lab.findByPk(id, {
            include: [
                {
                    model: Certification,
                    as: "certification",
                    attributes: ["id", "title", "passing_score", "validity_days", "is_active"],
                    required: false,
                },
                {
                    model: Course,
                    as: "course",
                    attributes: ["id", "title", "slug", "status"],
                    required: false,
                },
                {
                    model: LabQuestion,
                    as: "questions",
                    order: [["sort_order", "ASC"]],
                    required: false,
                },
            ],
        });

        if (!record) return null;
        const data = record.toJSON();
        await this._set(key, data, this.ttl);
        return data;
    }

    // ── Labs by course ordered ────────────────────────────────────────────────

    async findByCourseId(course_id) {
        const key = `lab:course:${course_id}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const records = await Lab.findAll({
            where: { course_id },
            order: [["sort_order", "ASC"]],
            include: [
                {
                    model: Certification,
                    as: "certification",
                    attributes: ["id", "title"],
                    required: false,
                },
            ],
        });

        const data = records.map((r) => r.toJSON());
        await this._set(key, data, this.ttl);
        return data;
    }

    // ── Cache invalidation ────────────────────────────────────────────────────

    async invalidateCache(id, course_id = null, slug = null) {
        const keys = [];
        if (id) {
            keys.push(`lab:full:${id}`, `lab:id:${id}`);
        }
        if (slug) {
            keys.push(`lab:slug:${slug}`);
        }
        if (keys.length) await this._del(...keys);
        if (course_id) await this._del(`lab:course:${course_id}`);
        await this._clearPattern("lab:list:*");
    }

    async update(id, data, options = {}) {
        const record = await this.model.findByPk(id);
        if (!record) return null;

        const oldSlug = record.slug;
        const courseId = record.course_id;

        await record.update(data, options);

        await this.invalidateCache(id, courseId, oldSlug);
        if (data.slug && data.slug !== oldSlug) {
            await this._del(`lab:slug:${data.slug}`);
        }

        const fresh = await this.model.findByPk(id);
        const json = fresh.toJSON();
        await this._set(`${this.prefix}:id:${id}`, json, this.ttl);
        return json;
    }

    // ── Questions ─────────────────────────────────────────────────────────────

    async bulkAddQuestions(lab_id, questions, options = {}) {
        const records = await LabQuestion.bulkCreate(
            questions.map((q, i) => ({ ...q, lab_id, sort_order: q.sort_order ?? i })),
            { returning: true, ...options }
        );
        await this._del(`lab:full:${lab_id}`);
        return records.map((r) => r.toJSON());
    }

    async updateQuestion(question_id, data) {
        const q = await LabQuestion.findByPk(question_id);
        if (!q) return null;
        await q.update(data);
        await this._del(`lab:full:${q.lab_id}`);
        return q.toJSON();
    }

    async deleteQuestion(question_id) {
        const q = await LabQuestion.findByPk(question_id);
        if (!q) return false;
        await q.destroy();
        await this._del(`lab:full:${q.lab_id}`);
        return true;
    }

    async deleteQuestionsByLabId(lab_id, options = {}) {
        await LabQuestion.destroy({ where: { lab_id }, ...options });
        await this._del(`lab:full:${lab_id}`);
        return true;
    }

    async getQuestions(lab_id) {
        const records = await LabQuestion.findAll({
            where: { lab_id },
            order: [["sort_order", "ASC"]],
        });
        return records.map((r) => r.toJSON());
    }

    // ── Assignments ───────────────────────────────────────────────────────────

    async createAssignment(lab_id, assigned_to, assigned_by, extras = {}) {
        const [record, created] = await LabAssignment.findOrCreate({
            where: { lab_id, assigned_to },
            defaults: { lab_id, assigned_to, assigned_by, ...extras },
        });
        return { assignment: record.toJSON(), created };
    }

    async updateAssignment(assignment_id, data) {
        const a = await LabAssignment.findByPk(assignment_id);
        if (!a) return null;
        await a.update(data);
        return a.toJSON();
    }

    async getAssignmentsByLab(lab_id) {
        const records = await LabAssignment.findAll({
            where: { lab_id },
            order: [["created_at", "DESC"]],
        });
        return records.map((r) => r.toJSON());
    }

    async getAssignmentsByUser(assigned_to) {
        const records = await LabAssignment.findAll({
            where: { assigned_to },
            include: [
                {
                    model: Lab,
                    as: "lab",
                    attributes: ["id", "title", "slug", "type", "difficulty", "certification_id"],
                    include: [
                        {
                            model: Certification,
                            as: "certification",
                            attributes: ["id", "title"],
                            required: false,
                        },
                    ],
                },
            ],
            order: [["created_at", "DESC"]],
        });
        return records.map((r) => r.toJSON());
    }

    async revokeAssignment(lab_id, assigned_to) {
        const count = await LabAssignment.destroy({ where: { lab_id, assigned_to } });
        return count > 0;
    }
}

module.exports = new LabRepository();

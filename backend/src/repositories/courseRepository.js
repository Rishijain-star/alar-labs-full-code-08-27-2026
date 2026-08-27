const BaseRepository = require("./baseRepository");
const {
    Course, Lab, CourseMedia, CourseQuestion, Certification, Category, User,
} = require("../models");

class CourseRepository extends BaseRepository {
    constructor() {
        super(Course, "course", 1800);
    }

    // ── Full course (admin view — all data) ───────────────────────────────────

    async update(id, data, options = {}) {
        const record = await this.model.findByPk(id);
        if (!record) return null;
        await record.update(data, options);
        await this.invalidateCache(id, record.slug);
        await this._del(`course:id:${id}`);
        await this._clearPattern(`${this.prefix}:list:*`);
        return this.findById(id);
    }

    async findByIdFull(id) {
        const key = `course:full:${id}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await Course.findByPk(id, {
            include: [
                {
                    model: Category,
                    as: "category",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: User,
                    as: "creator",
                    attributes: ["user_id", "full_name", "email"],
                    required: false,
                },
                {
                    model: Certification,
                    as: "certification",
                    attributes: ["id", "title", "passing_score", "validity_days", "is_active"],
                    required: false,
                },
                {
                    model: Lab,
                    as: "labs",
                    attributes: ["id", "title", "slug", "status", "difficulty", "type", "sort_order", "is_free", "certification_id"],
                    order: [["sort_order", "ASC"]],
                    required: false,
                    include: [
                        {
                            model: Certification,
                            as: "certification",
                            attributes: ["id", "title"],
                            required: false,
                        },
                    ],
                },
                {
                    model: CourseMedia,
                    as: "media",
                    order: [["sort_order", "ASC"]],
                    required: false,
                },
                {
                    model: CourseQuestion,
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

    // ── Public course view (respects paid/free locking) ───────────────────────

    async findByIdPublic(id, is_enrolled = false) {
        const key = `course:public:${id}:${is_enrolled}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await Course.findByPk(id, {
            include: [
                {
                    model: Category,
                    as: "category",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: Certification,
                    as: "certification",
                    attributes: ["id", "title", "passing_score", "validity_days"],
                    required: false,
                },
                {
                    model: Lab,
                    as: "labs",
                    attributes: [
                        "id", "title", "slug", "description", "difficulty", "type",
                        "sort_order", "is_free", "price", "time_limit_minutes", "status", "thumbnail",
                    ],
                    where: { status: "published" },
                    order: [["sort_order", "ASC"]],
                    required: false,
                },
                // Only show media if enrolled OR the item is a free preview
                {
                    model: CourseMedia,
                    as: "media",
                    order: [["sort_order", "ASC"]],
                    required: false,
                },
            ],
        });

        if (!record) return null;

        const course = record.toJSON();
        const is_free = course.is_free;

        // Lock media: hide non-preview items for unenrolled paid course
        if (!is_free && !is_enrolled) {
            course.media = course.media
                .filter((m) => m.is_preview)
                .map((m) => ({ ...m, _locked: false }));
        }

        // Lock labs: mark as locked for unenrolled paid course
        course.labs = course.labs.map((lab) => ({
            id: lab.id,
            title: lab.title,
            slug: lab.slug,
            description: lab.description,
            thumbnail: lab.thumbnail,
            difficulty: lab.difficulty,
            type: lab.type,
            sort_order: lab.sort_order,
            time_limit_minutes: lab.time_limit_minutes,
            is_free: lab.is_free,
            // Locked when course is paid, user not enrolled, and lab itself is not free
            is_locked: !is_free && !is_enrolled && !lab.is_free,
        }));

        // Hide questions entirely for unenrolled paid course
        if (!is_free && !is_enrolled) {
            course.questions = [];
            course._content_locked = true;
        } else {
            course._content_locked = false;
        }

        course._is_enrolled = is_enrolled;

        await this._set(key, course, 120); // 2 min TTL — enrollment can change
        return course;
    }

    // ── Slug ──────────────────────────────────────────────────────────────────

    async findBySlug(slug) {
        const key = `course:slug:${slug}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await Course.findOne({
            where: { slug },
            include: [
                {
                    model: CourseMedia,
                    as: "media",
                    order: [["sort_order", "ASC"]],
                    required: false,
                }
            ]
        });
        if (!record) return null;
        const data = record.toJSON();
        await this._set(key, data, this.ttl);
        return data;
    }

    // ── Cache invalidation ────────────────────────────────────────────────────

    async invalidateCache(id, slug = null) {
        await this._del(
            `course:full:${id}`,
            `course:id:${id}`,
            `course:public:${id}:true`,
            `course:public:${id}:false`,
        );
        if (slug) await this._del(`course:slug:${slug}`);
        await this._clearPattern("course:list:*");
    }

    // ── Media ─────────────────────────────────────────────────────────────────

    async bulkAddMedia(course_id, media_array, options = {}) {
        const { CourseMedia: CM } = require("../models");
        const records = await CM.bulkCreate(
            media_array.map((m, i) => ({ ...m, course_id, sort_order: m.sort_order ?? i })),
            { returning: true, ...options }
        );
        await this._del(`course:full:${course_id}`);
        await this._del(`course:public:${course_id}:true`, `course:public:${course_id}:false`);
        return records.map((r) => r.toJSON());
    }

    async updateMedia(media_id, data) {
        const { CourseMedia: CM } = require("../models");
        const media = await CM.findByPk(media_id);
        if (!media) return null;
        await media.update(data);
        await this._del(`course:full:${media.course_id}`);
        await this._del(`course:public:${media.course_id}:true`, `course:public:${media.course_id}:false`);
        return media.toJSON();
    }

    async deleteMedia(media_id) {
        const { CourseMedia: CM } = require("../models");
        const media = await CM.findByPk(media_id);
        if (!media) return false;
        await media.destroy();
        await this._del(`course:full:${media.course_id}`);
        await this._del(`course:public:${media.course_id}:true`, `course:public:${media.course_id}:false`);
        return true;
    }

    // ── Questions ─────────────────────────────────────────────────────────────

    async bulkAddQuestions(course_id, questions, options = {}) {
        const { CourseQuestion: CQ } = require("../models");
        const records = await CQ.bulkCreate(
            questions.map((q, i) => ({ ...q, course_id, sort_order: q.sort_order ?? i })),
            { returning: true, ...options }
        );
        await this._del(`course:full:${course_id}`);
        return records.map((r) => r.toJSON());
    }

    async updateQuestion(question_id, data) {
        const { CourseQuestion: CQ } = require("../models");
        const q = await CQ.findByPk(question_id);
        if (!q) return null;
        await q.update(data);
        await this._del(`course:full:${q.course_id}`);
        return q.toJSON();
    }

    async deleteQuestion(question_id) {
        const { CourseQuestion: CQ } = require("../models");
        const q = await CQ.findByPk(question_id);
        if (!q) return false;
        await q.destroy();
        await this._del(`course:full:${q.course_id}`);
        return true;
    }
}

module.exports = new CourseRepository();

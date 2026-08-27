const certificationService = require("../services/certificationService");
const response = require("../utils/response");

const { validate, fail } = require("../helper/helper");

class CertificationController {

    /** GET /api/certifications — public catalog (no auth) */
    listPublic = async (req, res) => {
        try {
            const { page = 1, limit = 24 } = req.query;
            const result = await certificationService.getAll({
                page: +page,
                limit: Math.min(100, +limit || 24),
                where: { is_active: true },
                order: [
                    ["sort_order", "ASC"],
                    ["title", "ASC"],
                ],
                attributes: [
                    "id",
                    "title",
                    "description",
                    "thumbnail",
                    "list_price",
                    "is_free",
                    "vendor_platform",
                    "duration_label",
                    "level",
                    "practice_question_count",
                    "exam_simulation_count",
                    "enrolled_display",
                    "exam_practice_url",
                ],
            });
            return response.success(res, "OK", 200, result);
        } catch (err) { return fail(res, err); }
    };

    /** GET /api/certifications/:id — public detail with published courses + labs (no auth) */
    getPublicById = async (req, res) => {
        try {
            const cert = await certificationService.getPublicByIdFull(req.params.id);
            return response.success(res, "OK", 200, { certification: cert });
        } catch (err) { return fail(res, err); }
    };

    // ─────────────────────────────────────────────────────────────────────────

    getAll = async (req, res) => {
        try {
            const { page = 1, limit = 20, is_active } = req.query;
            const where = {};
            if (is_active !== undefined) where.is_active = is_active === "true";

            const result = await certificationService.getAll({ page: +page, limit: +limit, where });
            return response.success(res, "Certifications fetched", 200, result);
        } catch (err) { return fail(res, err); }
    };

    getById = async (req, res) => {
        try {
            const cert = await certificationService.getByIdFull(req.params.id);
            return response.success(res, "Certification fetched", 200, { certification: cert });
        } catch (err) { return fail(res, err); }
    };

    /**
     * POST /api/certifications
     *
     * Accepts multipart/form-data OR application/json.
     *
     * FIELDS:
     *   title          required  string
     *   description    optional  string
     *   template_url   optional  string  — direct URL if not uploading a file
     *   passing_score  optional  integer 0–100
     *   validity_days  optional  integer ≥1
     *   is_active      optional  boolean
     *
     * FILE:
     *   templateFile  optional  → certificate template image/PDF
     *                              If provided, service uploads it and uses URL as template_url
     */
    create = async (req, res) => {
        try {
            await validate(req.body, {
                title: "required|string|minLength:3|maxLength:255",
                description: "string",
                template_url: "string",
                passing_score: "integer|min:0|max:100",
                validity_days: "integer|min:1",
            });

            const templateFile = req.file || null; // from uploadImage.single("templateFile")

            const cert = await certificationService.create({
                title: req.body.title,
                description: req.body.description || null,
                template_url: req.body.template_url || null,
                passing_score: req.body.passing_score ? parseInt(req.body.passing_score, 10) : 70,
                validity_days: req.body.validity_days ? parseInt(req.body.validity_days, 10) : null,
                is_active: req.body.is_active !== undefined
                    ? (req.body.is_active === "true" || req.body.is_active === true)
                    : true,
                created_by: req.user.user_id,
                // Pass file — service/storage layer uploads and sets final template_url
                _templateFile: templateFile,
            });

            return response.success(res, "Certification created", 201, { certification: cert });
        } catch (err) { return fail(res, err); }
    };

    /**
     * PUT /api/certifications/:id
     * Same as create — optionally re-upload the template image
     */
    update = async (req, res) => {
        try {
            await validate(req.body, {
                title: "string|minLength:3|maxLength:255",
                passing_score: "integer|min:0|max:100",
                validity_days: "integer|min:1",
                is_active: "boolean",
            });

            const templateFile = req.file || null;

            const payload = { ...req.body, updated_by: req.user.user_id };

            // Cast numeric fields from form-data strings
            if (payload.passing_score) payload.passing_score = parseInt(payload.passing_score, 10);
            if (payload.validity_days) payload.validity_days = parseInt(payload.validity_days, 10);
            if (payload.is_active !== undefined) {
                payload.is_active = payload.is_active === "true" || payload.is_active === true;
            }

            if (templateFile) payload._templateFile = templateFile;

            const cert = await certificationService.update(req.params.id, payload);
            return response.success(res, "Certification updated", 200, { certification: cert });
        } catch (err) { return fail(res, err); }
    };

    deleteCertification = async (req, res) => {
        try {
            await certificationService.delete(req.params.id);
            return response.success(res, "Certification deleted", 200);
        } catch (err) { return fail(res, err); }
    };
}

module.exports = new CertificationController();
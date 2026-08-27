const cloudServiceService = require("../services/cloudServiceService");
const response = require("../utils/response");
const { validate, fail } = require("../helper/helper");
const { CloudServiceRequest } = require("../models");

class CloudServiceController {
    /** GET /api/cloud-services — public */
    listPublic = async (req, res) => {
        try {
            const { Op } = require("sequelize");
            const sequelize = require("../models").sequelize;
            
            const result = await cloudServiceService.getAll({
                where: { 
                    is_active: true,
                    [Op.and]: [
                        sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.content_approval_status')) = 'approved'`)
                    ]
                },
                order: [
                    ["sort_order", "ASC"],
                    ["title", "ASC"],
                ],
            });
            return response.success(res, "OK", 200, result);
        } catch (err) {
            return fail(res, err);
        }
    };

    getAll = async (req, res) => {
        try {
            const { page = 1, limit = 20, is_active, approval } = req.query;
            let where = {};
            if (is_active !== undefined) where.is_active = is_active === "true";

            if (approval === "pending") {
                const { Op } = require("sequelize");
                const sequelize = require("../models").sequelize;
                where[Op.or] = [
                    sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.content_approval_status')) = 'pending'`),
                    { draft_data: { [Op.not]: null } }
                ];
            }

            const result = await cloudServiceService.getAll({
                page: +page,
                limit: +limit,
                where,
            });
            
            if (result && Array.isArray(result.rows)) {
                result.rows = result.rows.map(row => {
                    const data = row.toJSON ? row.toJSON() : row;
                    if (data.draft_data) {
                        return { 
                            ...data, 
                            ...data.draft_data, 
                            metadata: { ...(data.metadata || {}), content_approval_status: "pending" },
                            draft_data: data.draft_data 
                        };
                    }
                    return data;
                });
            }

            return response.success(res, "Cloud services fetched", 200, result);
        } catch (err) {
            return fail(res, err);
        }
    };

    getById = async (req, res) => {
        try {
            const record = await cloudServiceService.getByIdFull(req.params.id);
            const data = record.toJSON ? record.toJSON() : record;
            if (data.draft_data) {
                Object.assign(data, data.draft_data, { 
                    metadata: { ...(data.metadata || {}), content_approval_status: "pending" },
                    draft_data: data.draft_data 
                });
            }
            return response.success(res, "Cloud service fetched", 200, {
                cloudService: data,
            });
        } catch (err) {
            return fail(res, err);
        }
    };

    create = async (req, res) => {
        try {
            await validate(req.body, {
                title: "required|string|minLength:3|maxLength:255",
                description: "string",
            });

            const isActive = req.body.is_active === true || req.body.is_active === "true";
            const metadata = {
                content_approval_status: isActive ? "pending" : null
            };

            const record = await cloudServiceService.create({
                ...req.body,
                metadata,
                created_by: req.user.user_id,
            });

            return response.success(res, "Cloud service created", 201, {
                cloudService: record,
            });
        } catch (err) {
            return fail(res, err);
        }
    };

    update = async (req, res) => {
        try {
            await validate(req.body, {
                title: "string|minLength:3|maxLength:255",
                description: "string",
            });

            const existing = await cloudServiceService.getByIdFull(req.params.id);
            const exMeta = existing.metadata || {};
            const isActive = req.body.is_active === true || req.body.is_active === "true";
            
            let updatePayload = {
                ...req.body,
                updated_by: req.user.user_id,
            };

            // If it's already approved and we are submitting active changes, stash in draft_data
            if (exMeta.content_approval_status === "approved" && isActive) {
                updatePayload = {
                    metadata: { ...exMeta, content_approval_status: "approved" },
                    draft_data: req.body,
                    updated_by: req.user.user_id,
                };
            } else if (isActive && exMeta.content_approval_status !== "approved") {
                updatePayload.metadata = { ...exMeta, content_approval_status: "pending" };
            }

            const record = await cloudServiceService.update(req.params.id, updatePayload);

            return response.success(res, "Cloud service updated", 200, {
                cloudService: record,
            });
        } catch (err) {
            return fail(res, err);
        }
    };

    deleteCloudService = async (req, res) => {
        try {
            await cloudServiceService.delete(req.params.id);
            return response.success(res, "Cloud service deleted", 200);
        } catch (err) {
            return fail(res, err);
        }
    };

    setContentApproval = async (req, res) => {
        try {
            await validate(req.body, { status: "required|string|in:approved,rejected" });
            const rbacService = require("../services/rbac/roleService");
            
            const userId = req.user?.user_id;
            if (!userId) return response.fail(res, "Authentication required", 401);
            
            const canApprove = await rbacService.checkUserHasPermission(userId, ["approve_cloud_services"], "OR");
            if (!canApprove) {
                return response.fail(res, "Insufficient permissions to approve cloud services", 403);
            }

            const existing = await cloudServiceService.getByIdFull(req.params.id);
            if (!existing) return response.fail(res, "Cloud service not found", 404);

            const exMeta = existing.metadata || {};
            let updatePayload = {};

            if (req.body.status === "approved") {
                if (existing.draft_data) {
                    updatePayload = { ...existing.draft_data, draft_data: null };
                }
                updatePayload.metadata = { ...(updatePayload.metadata || exMeta || {}), content_approval_status: "approved" };
            } else if (req.body.status === "rejected") {
                if (existing.draft_data && exMeta.content_approval_status === "approved") {
                    updatePayload.metadata = { ...exMeta, content_approval_status: "approved" };
                    updatePayload.draft_data = null;
                } else {
                    updatePayload.metadata = { ...exMeta, content_approval_status: "rejected" };
                    if (existing.draft_data) {
                        updatePayload.draft_data = null;
                    }
                }
            }

            const updated = await cloudServiceService.update(req.params.id, updatePayload);
            
            if (req.body.status === "approved") {
                const notificationService = require("../services/notificationService");
                try {
                    await notificationService.createNotification({
                        audience: "user",
                        eventType: "new_course_published",
                        title: "Cloud Service Approved",
                        message: `Cloud Service "${updated.title}" has been approved.`,
                        metadata: { serviceId: updated.id, priority: "normal" },
                    });
                } catch (_) {}
            }

            return response.success(res, `Cloud service ${req.body.status}`, 200, { cloudService: updated });
        } catch (err) {
            return fail(res, err);
        }
    };

    /** Public route: submit request */
    submitRequest = async (req, res) => {
        try {
            await validate(req.body, {
                name: "required|string",
                email: "required|email",
                contact_number: "required|string|minLength:6|maxLength:30",
                request_type: "required|in:self,corporate",
                organization: "string",
                requirements: "string",
                cloud_service_id: "string",
            });

            const requestType = req.body.request_type;
            const organization =
                requestType === "corporate"
                    ? String(req.body.organization || "").trim() || null
                    : null;

            if (requestType === "corporate" && !organization) {
                return response.error(res, "Organization name is required for corporate requests", 400);
            }

            const request = await CloudServiceRequest.create({
                name: req.body.name,
                email: req.body.email,
                contact_number: String(req.body.contact_number || "").trim(),
                request_type: requestType,
                organization,
                requirements: req.body.requirements || null,
                cloud_service_id: req.body.cloud_service_id || null,
                user_id: req.user?.user_id || null,
            });

            return response.success(res, "Request submitted", 201, { request });
        } catch (err) {
            return fail(res, err);
        }
    };

    /** Admin route: get all requests */
    getAllRequests = async (req, res) => {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const where = {};
            if (status) where.status = status;

            const result = await CloudServiceRequest.findAndCountAll({
                where,
                include: [
                    { model: require("../models").CloudService, as: "service" },
                    { model: require("../models").User, as: "user", attributes: ["user_id", "full_name", "email"] },
                ],
                limit: Math.min(100, +limit),
                offset: (+page - 1) * +limit,
                order: [["created_at", "DESC"]],
            });

            return response.success(res, "Requests fetched", 200, {
                data: result.rows,
                total: result.count,
                page: +page,
                limit: +limit,
            });
        } catch (err) {
            return fail(res, err);
        }
    };

    /** Admin route: update request status */
    updateRequestStatus = async (req, res) => {
        try {
            await validate(req.body, {
                status: "required|in:pending,in_progress,completed,rejected",
            });

            const request = await CloudServiceRequest.findByPk(req.params.id);
            if (!request) {
                return response.error(res, "Request not found", 404);
            }

            request.status = req.body.status;
            await request.save();

            return response.success(res, "Request updated", 200, { request });
        } catch (err) {
            return fail(res, err);
        }
    };
}

module.exports = new CloudServiceController();

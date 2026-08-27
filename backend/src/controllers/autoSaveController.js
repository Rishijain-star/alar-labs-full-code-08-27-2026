const response = require("../utils/response");
const redisManager = require("../lib/redisManager");

// Drafts live for 30 days
const DRAFT_TTL_SECONDS = 60 * 60 * 24 * 30;

function getDraftKey(userId, entityType, entityId) {
    return `autosave:${userId}:${entityType}:${entityId}`;
}

class AutoSaveController {
    getDraft = async (req, res) => {
        try {
            const userId = req.user?.user_id;
            const { entityType, entityId } = req.params;

            if (!userId || !entityType || !entityId) {
                return response.fail(res, "Missing parameters", 400);
            }

            const redis = await redisManager.getClientSafe();
            if (!redis) {
                return response.success(res, "Redis unavailable", 200, { draft: null });
            }

            const key = getDraftKey(userId, entityType, entityId);
            const data = await redis.get(key);

            if (!data) {
                return response.success(res, "No draft found", 200, { draft: null });
            }

            return response.success(res, "Draft retrieved", 200, { draft: JSON.parse(data) });
        } catch (err) {
            return response.fail(res, err);
        }
    };

    saveDraft = async (req, res) => {
        try {
            const userId = req.user?.user_id;
            const { entityType, entityId } = req.params;
            const { draftData } = req.body;

            if (!userId || !entityType || !entityId || !draftData) {
                return response.fail(res, "Missing parameters or draft data", 400);
            }

            const redis = await redisManager.getClientSafe();
            if (!redis) {
                return response.fail(res, "Redis unavailable, cannot save draft", 503);
            }

            const key = getDraftKey(userId, entityType, entityId);
            const payload = JSON.stringify({
                updatedAt: new Date().toISOString(),
                data: draftData,
            });

            await redis.setEx(key, DRAFT_TTL_SECONDS, payload);

            return response.success(res, "Draft saved", 200, { saved: true });
        } catch (err) {
            return response.fail(res, err);
        }
    };

    clearDraft = async (req, res) => {
        try {
            const userId = req.user?.user_id;
            const { entityType, entityId } = req.params;

            if (!userId || !entityType || !entityId) {
                return response.fail(res, "Missing parameters", 400);
            }

            const redis = await redisManager.getClientSafe();
            if (redis) {
                const key = getDraftKey(userId, entityType, entityId);
                await redis.del(key);
            }

            return response.success(res, "Draft cleared", 200, { cleared: true });
        } catch (err) {
            return response.fail(res, err);
        }
    };
}

module.exports = new AutoSaveController();

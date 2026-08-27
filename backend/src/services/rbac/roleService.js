const {
    Role,
    RolePermission,
    Permission,
    User,
    sequelize
} = require('../../models');
const { Op } = require('sequelize');
const redisManager = require('../../lib/redisManager');
const logger = require('../../lib/logger');
const { AppError } = require('../../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');
const { blacklistJti, decodeToken, getTokenRemainingTTL } = require('../../utils/token');
const { expandImpliedPermissions: expandBundlePermissions, PERMISSION_BUNDLE_GROUPS } = require('../../constants/permissionBundles');

/**
 * Role Service (Sequelize + Redis)
 *
 * TOKEN BLACKLISTING STRATEGY
 * ───────────────────────────
 * When PERMISSIONS are assigned/removed on a role:
 *  1. ONLY users who belong to that specific roleId are affected.
 *  2. The admin who triggered the change is fully skipped (token untouched).
 *  3. Affected users' JWTs are blacklisted by jti — sessions are NOT destroyed.
 *  4. On their next request they receive 401 TOKEN_REVOKED and must re-login.
 *
 * When role METADATA is updated (name, description, isActive, priority):
 *  - Permissions did NOT change, so NO token blacklisting occurs.
 *  - Only caches are cleared.
 *
 * Auth middleware must call:
 *   const revoked = await isJtiBlacklisted(payload.jti, payload.exp);
 *   if (revoked) return res.status(401).json({ code: 'TOKEN_REVOKED' });
 */
class RoleService {
    constructor() {
        this.CACHE_TTL = {
            USER_PERMISSIONS: 900,
            USER_ROLE: 900,
            ROLE_PERMISSIONS: 1800,
            ROLE_DATA: 1800,
            USER_PROFILE: 900,
            ALL_ROLES: 300,
        };

        this.CACHE_PREFIX = {
            USER_PERMISSIONS: 'user_permissions:',
            USER_ROLE: 'user_role:',
            ROLE_PERMISSIONS: 'role_permissions:',
            ROLE_DATA: 'role_data:',
            USER_PROFILE: 'user_permission_profile:',
            ALL_ROLES: 'all_roles:',
        };
    }

    // ─────────────────────────────────────────────────────────────
    //  REDIS
    // ─────────────────────────────────────────────────────────────

    async _getRedisClient() {
        try {
            if (!redisManager.isReady()) {
                logger.warn('Redis not ready, skipping cache');
                return null;
            }
            return await redisManager.getClientSafe();
        } catch (error) {
            logger.warn('Redis not available:', error.message);
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  TOKEN BLACKLISTING
    //  - Only blacklists the JWT token (jti-based)
    //  - Sessions are NEVER destroyed
    //  - Only called from clearRoleCache (permission changes only)
    // ─────────────────────────────────────────────────────────────

    /**
     * Blacklist all active JWTs for a single user.
     * The caller is responsible for skipping the admin — this method
     * blacklists unconditionally for whoever is passed in.
     *
     * @param {string}      user_id
     * @param {string|null} revoked_by  - For audit logging only
     * @param {Object}      [opts]
     */
    async _blacklistUserTokens(user_id, revoked_by = null, opts = {}) {
        try {
            const sessionService = require('../sessionService');
            const sessions = await sessionService.getUserSessions(user_id);

            if (!sessions || sessions.length === 0) {
                logger.debug(`[blacklist] No active sessions for user ${user_id}`);
                return;
            }

            let blacklisted = 0;
            let skipped = 0;

            for (const session of sessions) {
                const raw = session.dataValues ?? session;

                if (blacklisted === 0 && skipped === 0) {
                    logger.debug(`[blacklist] Session shape for user ${user_id}: [${Object.keys(raw).join(', ')}]`);
                }

                const sessionId =
                    raw.sessionId ??
                    raw.session_id ??
                    raw.id ??
                    '(unknown)';

                const rawToken =
                    raw.accessToken ??
                    raw.access_token ??
                    raw.token ??
                    null;

                const directJti = raw.jti ?? null;

                // ── Path A: full JWT string available ───────────────────────────
                if (rawToken) {
                    const decoded = await decodeToken(rawToken);

                    if (!decoded) {
                        logger.warn(`[blacklist] Cannot decode token for session ${sessionId} — skipping`);
                        skipped++;
                        continue;
                    }

                    if (!decoded.jti) {
                        logger.warn(`[blacklist] Session ${sessionId} token has no jti (old token). Expires ${new Date((decoded.exp ?? 0) * 1000).toISOString()}`);
                        skipped++;
                        continue;
                    }

                    const ttl = await getTokenRemainingTTL(rawToken);
                    if (ttl === 0) {
                        logger.debug(`[blacklist] Session ${sessionId} token already expired — skipping`);
                        skipped++;
                        continue;
                    }

                    await blacklistJti({
                        jti: decoded.jti,
                        userId: user_id,
                        exp: decoded.exp,
                        reason: opts.reason ?? 'role_permissions_updated',
                        revokedBy: revoked_by ?? null,
                        ipAddress: opts.ipAddress ?? null,
                        userAgent: opts.userAgent ?? null,
                    });

                    logger.debug(`[blacklist] Token blacklisted for session ${sessionId}, user ${user_id}`);
                    blacklisted++;
                    continue;
                }

                // ── Path B: only jti stored ─────────────────────────────────────
                if (directJti) {
                    const fallbackExp = Math.floor(Date.now() / 1000) + 900;
                    await blacklistJti({
                        jti: directJti,
                        userId: user_id,
                        exp: fallbackExp,
                        reason: opts.reason ?? 'role_permissions_updated',
                        revokedBy: revoked_by ?? null,
                        ipAddress: opts.ipAddress ?? null,
                        userAgent: opts.userAgent ?? null,
                    });

                    logger.debug(`[blacklist] Token blacklisted via direct jti for session ${sessionId}, user ${user_id}`);
                    blacklisted++;
                    continue;
                }

                // ── Path C: nothing usable ──────────────────────────────────────
                logger.warn(`[blacklist] Session ${sessionId} has no accessToken/token/jti — cannot blacklist`);
                skipped++;
            }

            logger.info(`[blacklist] User ${user_id}: ${blacklisted} blacklisted, ${skipped} skipped`);

        } catch (error) {
            logger.error(`[blacklist] _blacklistUserTokens error for user ${user_id}:`, error.message);
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  ROLE QUERIES
    // ─────────────────────────────────────────────────────────────

    async getAllRoles(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                status = null,
                sort_by = 'created_at',
                sort_order = 'desc'
            } = options;

            const where = {};
            const redis = await this._getRedisClient();
            const cacheKey = `${this.CACHE_PREFIX.ALL_ROLES}p${page}_l${limit}_s${encodeURIComponent(search)}_st${status || 'all'}_sb${sort_by}_so${sort_order}`;

            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        logger.debug(`Cache HIT - all roles: ${cacheKey}`);
                        return JSON.parse(cached);
                    }
                    logger.debug(`Cache MISS - all roles: ${cacheKey}`);
                } catch (err) {
                    logger.warn('Cache read failed for all roles:', err.message);
                }
            }

            if (search) {
                const like = `%${search.toLowerCase()}%`;
                where[Op.or] = [
                    sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), Op.like, like),
                    sequelize.where(sequelize.fn('LOWER', sequelize.col('description')), Op.like, like),
                ];
            }

            if (status === 'active') where.is_active = true;
            else if (status === 'inactive') where.is_active = false;

            const offset = (page - 1) * limit;

            const { count, rows: roles } = await Role.findAndCountAll({
                where,
                include: [{
                    model: Permission,
                    as: 'permissions',
                    attributes: ['id', 'label', 'description', 'action'],
                    through: { attributes: [] },
                    required: false,
                }],
                limit,
                offset,
                order: [[sort_by, sort_order.toUpperCase()]],
                distinct: true,
            });

            const result = {
                roles: roles.map(r => r.toJSON()),
                pagination: {
                    page, limit, total: count,
                    totalPages: Math.ceil(count / limit),
                    hasNextPage: page < Math.ceil(count / limit),
                    hasPrevPage: page > 1
                }
            };

            if (redis) {
                try {
                    await redis.setEx(cacheKey, this.CACHE_TTL.ALL_ROLES, JSON.stringify(result));
                } catch (err) {
                    logger.warn('Failed to cache all roles:', err.message);
                }
            }

            return result;

        } catch (error) {
            logger.error('Get all roles error:', { message: error.message, options });
            throw new AppError('Failed to retrieve roles', 500, 'GET_ROLES_ERROR');
        }
    }

    async getRoleById(role_id) {
        try {
            const redis = await this._getRedisClient();
            const cacheKey = `${this.CACHE_PREFIX.ROLE_DATA}${role_id}`;

            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) return JSON.parse(cached);
                } catch (_) { }
            }

            const role = await Role.findByPk(role_id, {
                include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
            });

            if (!role) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');

            const role_data = role.toJSON();

            if (redis) {
                try {
                    await redis.setEx(cacheKey, this.CACHE_TTL.ROLE_DATA, JSON.stringify(role_data));
                } catch (_) { }
            }

            return role_data;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Get role by ID error:', error);
            throw new AppError('Failed to retrieve role', 500, 'GET_ROLE_ERROR');
        }
    }

    async getRoleComplete(role_id) {
        try {
            const role = await Role.findByPk(role_id, {
                include: [{
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: ['assigned_by', 'assigned_at'] },
                }]
            });

            if (!role) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
            return role.toJSON();
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Get role complete error:', error);
            throw new AppError('Failed to retrieve role details', 500, 'GET_ROLE_COMPLETE_ERROR');
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  ROLE MUTATIONS
    // ─────────────────────────────────────────────────────────────

    async createRole(role_data) {
        try {
            const { name, description, permissions = [], is_active = true, priority = 0, created_by } = role_data;

            const existing_role = await Role.findOne({ where: { name } });
            if (existing_role) throw new AppError('Role with this name already exists', 400, 'ROLE_EXISTS');

            const role = await Role.create({
                name, description, is_active: is_active, priority, created_by: created_by
            });

            if (permissions.length > 0) {
                await this.assignPermissionsToRole(role.id, permissions, created_by);
            }

            await this.clearAllRolesListCache();
            logger.info(`Role created: ${role.id} by ${created_by}`);

            return await this.getRoleById(role.id);
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Create role error:', error);
            throw new AppError('Failed to create role', 500, 'CREATE_ROLE_ERROR');
        }
    }

    async updateRole(role_id, update_data) {
        try {
            if (update_data.updated_by) {
                await this._assertCanManageRole(update_data.updated_by, role_id);
            }
            const role = await Role.findByPk(role_id);
            if (!role) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');

            await role.update({
                ...(update_data.name && { name: update_data.name }),
                ...(update_data.description !== undefined && { description: update_data.description }),
                ...(update_data.is_active !== undefined && { is_active: update_data.is_active }),
                ...(update_data.priority !== undefined && { priority: update_data.priority }),
                updated_by: update_data.updated_by
            });

            // ✅ FIX: updateRole only changes metadata (name/description/etc).
            // Permissions did NOT change → NO token blacklisting.
            // Only clear caches so stale data is not served.
            await this._clearRoleCacheOnly(role_id);
            logger.info(`Role updated: ${role_id} by ${update_data.updated_by}`);

            return await this.getRoleById(role_id);
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Update role error:', error);
            throw new AppError('Failed to update role', 500, 'UPDATE_ROLE_ERROR');
        }
    }

    async deleteRole(role_id, deleted_by) {
        try {
            await this._assertCanManageRole(deleted_by, role_id);
            const role = await Role.findByPk(role_id);
            if (!role) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');

            const user_count = await User.count({ where: { role_id: role_id } });
            if (user_count > 0) {
                throw new AppError(`Cannot delete role. It is assigned to ${user_count} user(s)`, 400, 'ROLE_IN_USE');
            }

            const RolePermissionModel = RolePermission || sequelize.models.RolePermission;
            if (RolePermissionModel) {
                await RolePermissionModel.destroy({ where: { role_id: role_id } });
            } else {
                await sequelize.query(
                    'DELETE FROM role_permissions WHERE role_id = :role_id',
                    { replacements: { role_id } }
                );
            }
            if (!role || typeof role.destroy !== 'function') {
                throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
            }
            await role.destroy();

            // Role is gone so just clear caches — no active users to blacklist
            await this._clearRoleCacheOnly(role_id);
            logger.info(`Role deleted: ${role_id} by ${deleted_by}`);

            return true;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Delete role error:', error);
            throw new AppError('Failed to delete role', 500, 'DELETE_ROLE_ERROR');
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  PERMISSION ASSIGNMENT
    // ─────────────────────────────────────────────────────────────

    _inferPermissionAction(permissionId) {
        const id = String(permissionId || "");
        if (id.startsWith("view_")) return "read";
        if (id.startsWith("create_")) return "create";
        if (id.startsWith("edit_")) return "update";
        if (id.startsWith("delete_")) return "delete";
        if (id.startsWith("publish_")) return "publish";
        if (id.startsWith("approve_")) return "approve";
        if (id.startsWith("manage_")) return "manage";
        return "manage";
    }

    _buildPermissionRow(permissionId) {
        for (const group of PERMISSION_BUNDLE_GROUPS) {
            for (const bundle of group.bundles) {
                if (bundle.id === permissionId) {
                    return {
                        id: permissionId,
                        label: bundle.label,
                        description: bundle.description,
                        action: this._inferPermissionAction(permissionId),
                        resource_type: "system",
                        scope: "global",
                        created_by: "system",
                    };
                }
            }
        }

        const label = String(permissionId)
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        return {
            id: permissionId,
            label,
            description: `Can ${String(permissionId).replace(/_/g, " ")}`,
            action: this._inferPermissionAction(permissionId),
            resource_type: "system",
            scope: "global",
            created_by: "system",
        };
    }

    async _ensurePermissionsExist(permission_ids, transaction) {
        const ids = [...new Set((permission_ids || []).filter(Boolean))];
        if (!ids.length) return;

        const existing = await Permission.findAll({
            where: { id: ids },
            attributes: ["id"],
            transaction,
        });
        const have = new Set(existing.map((p) => p.id));
        const missing = ids.filter((id) => !have.has(id));
        if (!missing.length) return;

        const rows = missing.map((id) => this._buildPermissionRow(id));
        await Permission.bulkCreate(rows, { ignoreDuplicates: true, transaction });
        logger.info(`Auto-created ${rows.length} missing permissions: ${missing.join(", ")}`);
    }

    async assignPermissionsToRole(role_id, permission_ids, assigned_by) {
        const transaction = await sequelize.transaction();

        try {
            await this._assertCanManageRole(assigned_by, role_id);
            const role = await Role.findByPk(role_id, { transaction });
            if (!role) {
                await transaction.rollback();
                throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
            }

            const expanded_ids = this._expandImpliedPermissions(permission_ids);

            await this._ensurePermissionsExist(expanded_ids, transaction);

            const permissions = await Permission.findAll({
                where: { id: expanded_ids }, attributes: ['id'], transaction
            });

            const found_ids = permissions.map(p => p.id);
            const missing_ids = expanded_ids.filter(id => !found_ids.includes(id));

            if (missing_ids.length > 0) {
                logger.warn(
                    `Skipping unknown permission ids for role ${role_id}: ${missing_ids.join(', ')}`
                );
            }

            if (found_ids.length === 0 && expanded_ids.length > 0) {
                await transaction.rollback();
                throw new AppError('No valid permissions found to assign', 400, 'PERMISSION_NOT_FOUND');
            }

            await RolePermission.destroy({ where: { role_id: role_id }, transaction });

            const associations = found_ids.map(perm_id => ({
                id: uuidv4(),
                role_id: role_id,
                permission_id: perm_id,
                assigned_by: assigned_by,
                assigned_at: new Date()
            }));

            await RolePermission.bulkCreate(associations, { transaction });
            await transaction.commit();

            // ✅ Permissions changed → blacklist tokens for role users (skip admin)
            await this.clearRoleCache(role_id, assigned_by);
            logger.info(`Permissions assigned to role ${role_id}: ${found_ids.join(', ')}`);

            return {
                role_id, permissions: found_ids, assigned_by,
                assigned_at: new Date(), success_count: found_ids.length,
                failure_count: missing_ids.length, failures: missing_ids
            };
        } catch (error) {
            try { await transaction.rollback(); } catch (_) { }
            if (error instanceof AppError) throw error;
            logger.error('Assign permissions error:', error);
            throw new AppError('Failed to assign permissions', 500, 'ASSIGN_PERMISSIONS_ERROR');
        }
    }

    async removePermissionFromRole(role_id, permission_id, removed_by) {
        try {
            const role = await Role.findByPk(role_id);
            if (!role) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');

            const deleted = await RolePermission.destroy({
                where: { role_id: role_id, permission_id: permission_id }
            });

            if (deleted === 0) throw new AppError('Permission not assigned to this role', 404, 'PERMISSION_NOT_ASSIGNED');

            // ✅ Permissions changed → blacklist tokens for role users (skip admin)
            await this.clearRoleCache(role_id, removed_by);
            logger.info(`Permission ${permission_id} removed from role ${role_id} by ${removed_by}`);

            return true;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Remove permission error:', error);
            throw new AppError('Failed to remove permission', 500, 'REMOVE_PERMISSION_ERROR');
        }
    }

    async getRolePermissions(role_id) {
        try {
            const redis = await this._getRedisClient();
            const cacheKey = `${this.CACHE_PREFIX.ROLE_PERMISSIONS}${role_id}`;

            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) return JSON.parse(cached);
                } catch (_) { }
            }

            const role_permissions = await RolePermission.findAll({
                where: { role_id: role_id }, attributes: ['permission_id'], raw: true
            });

            const permission_ids = role_permissions.map(rp => rp.permission_id);

            if (redis) {
                try {
                    await redis.setEx(cacheKey, this.CACHE_TTL.ROLE_PERMISSIONS, JSON.stringify(permission_ids));
                } catch (_) { }
            }

            return permission_ids;
        } catch (error) {
            logger.error('Get role permissions error:', error);
            throw new AppError('Failed to retrieve role permissions', 500, 'GET_ROLE_PERMISSIONS_ERROR');
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  USER ACCESS
    // ─────────────────────────────────────────────────────────────

    async getUserPermissions(user_id) {
        try {
            const redis = await this._getRedisClient();
            const cacheKey = `${this.CACHE_PREFIX.USER_PERMISSIONS}${user_id}`;

            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) return JSON.parse(cached);
                } catch (_) { }
            }

            const user = await User.findByPk(user_id, { attributes: ['role_id'] });
            if (!user || !user.role_id) return [];

            const role_permissions = await this.getRolePermissions(user.role_id);
            const expanded = this._expandImpliedPermissions(role_permissions);

            if (redis) {
                try {
                    await redis.setEx(cacheKey, this.CACHE_TTL.USER_PERMISSIONS, JSON.stringify(expanded));
                } catch (_) { }
            }

            return expanded;
        } catch (error) {
            logger.error('Get user permissions error:', error);
            return [];
        }
    }

    async getUserAccessSummary(user_id) {
        try {
            const user = await User.findByPk(user_id, {
                attributes: ['user_id', 'email', 'full_name', 'role_id'],
                include: [{
                    model: Role, as: 'role',
                    include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
                }]
            });

            if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

            const user_data = user.toJSON();

            return {
                user: { user_id: user_data.user_id, email: user_data.email, full_name: user_data.full_name },
                role: user_data.role
                    ? { id: user_data.role.id, name: user_data.role.name, description: user_data.role.description, priority: user_data.role.priority }
                    : null,
                permissions: {
                    total: user_data.role?.permissions?.length || 0,
                    list: user_data.role?.permissions?.map(p => ({ id: p.id, label: p.label })) || []
                },
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Get user access summary error:', error);
            throw new AppError('Failed to retrieve user access summary', 500, 'GET_USER_ACCESS_ERROR');
        }
    }

    /**
     * Super Admin role bypasses explicit permission list checks (new permissions
     * can be added to routes without re-assigning every permission to that role).
     */
    _isSuperAdminRole(role) {
        if (!role || role.is_active === false) return false;
        const n = String(role.name || '').trim().toLowerCase();
        const id = String(role.id || '');
        return n === 'super admin' || n === 'super_admin' || id === '23ea22ce-e1f5-4435-8cd2-162756cb4be0';
    }

    /** Admin role gets full access like Super Admin (including new permissions). */
    _isAdminRole(role) {
        if (!role || role.is_active === false) return false;
        const n = String(role.name || '').trim().toLowerCase();
        const id = String(role.id || '');
        return n === 'admin' || id === 'b80aae54-858d-4b52-b0b9-a53502231750';
    }

    async _assertCanManageRole(actor_user_id, target_role_id) {
        const target = await Role.findByPk(target_role_id);
        if (!target) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
        if (this._isSuperAdminRole(target)) {
            const actorRole = await this.getUserRole(actor_user_id);
            if (!this._isSuperAdminRole(actorRole)) {
                throw new AppError('Only Super Admin can modify the Super Admin role', 403, 'SUPER_ADMIN_PROTECTED');
            }
        }
        return target;
    }

    /**
     * Broad "manage_*" grants implied CRUD for category-style resources (avoids
     * breaking when routes use granular ids like view_categories).
     */
    _expandImpliedPermissions(permission_ids) {
        const expanded = expandBundlePermissions(permission_ids || []);
        const set = new Set(expanded);
        if (set.has('manage_categories')) {
            ['view_categories', 'create_categories', 'edit_categories', 'delete_categories'].forEach((p) => set.add(p));
        }
        return [...set];
    }

    async checkUserHasPermission(user_id, permission_ids, operator = 'OR') {
        try {
            if (user_id && typeof user_id === 'object') {
                user_id = user_id.user_id ?? user_id.id ?? user_id.userId ?? null;
            }
            if (!user_id || String(user_id) === 'undefined') {
                return false;
            }
            const role = await this.getUserRole(user_id);
            if (this._isSuperAdminRole(role)) {
                logger.debug(`Permission check for user ${user_id}: GRANTED (Super Admin)`);
                return true;
            }
            if (this._isAdminRole(role)) {
                logger.debug(`Permission check for user ${user_id}: GRANTED (Admin)`);
                return true;
            }

            const permissions_to_check = Array.isArray(permission_ids) ? permission_ids : [permission_ids];
            if (permissions_to_check.length === 0) {
                return true;
            }
            const user_permissions = await this.getUserPermissions(user_id);

            const has_permission = operator === 'AND'
                ? permissions_to_check.every(p => user_permissions.includes(p))
                : permissions_to_check.some(p => user_permissions.includes(p));

            logger.debug(`Permission check for user ${user_id}: ${has_permission ? 'GRANTED' : 'DENIED'}`);
            return has_permission;
        } catch (error) {
            logger.error('Check user permission error:', error);
            return false;
        }
    }

    async getUserRole(user_id) {
        try {
            if (user_id && typeof user_id === 'object') {
                user_id = user_id.user_id ?? user_id.id ?? user_id.userId ?? null;
            }
            if (!user_id || String(user_id) === 'undefined') {
                return null;
            }
            const redis = await this._getRedisClient();
            const cacheKey = `${this.CACHE_PREFIX.USER_ROLE}${user_id}`;

            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) return JSON.parse(cached);
                } catch (_) { }
            }

            const user = await User.findByPk(user_id, {
                attributes: ['role_id'],
                include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'description', 'priority', 'is_active'] }]
            });

            if (!user || !user.role) return null;

            const role_data = user.role.toJSON();

            if (redis) {
                try {
                    await redis.setEx(cacheKey, this.CACHE_TTL.USER_ROLE, JSON.stringify(role_data));
                } catch (_) { }
            }

            return role_data;
        } catch (error) {
            logger.error('Get user role error:', error);
            return null;
        }
    }

    async getRoleUsers(role_id, options = {}) {
        try {
            const { page = 1, limit = 20 } = options;

            const role = await Role.findByPk(role_id);
            if (!role) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');

            const offset = (page - 1) * limit;

            const { count, rows: users } = await User.findAndCountAll({
                where: { role_id: role_id },
                attributes: ['user_id', 'email', 'full_name', 'is_active', 'is_verified', 'created_at'],
                limit, offset,
                order: [['created_at', 'DESC']]
            });

            return {
                users: users.map(u => u.toJSON()),
                pagination: { page, limit, total: count, total_pages: Math.ceil(count / limit) }
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Get role users error:', error);
            throw new AppError('Failed to retrieve role users', 500, 'GET_ROLE_USERS_ERROR');
        }
    }

    async duplicateRole(role_id, new_name, created_by) {
        try {
            const source_role = await this.getRoleById(role_id);
            if (!source_role) throw new AppError('Source role not found', 404, 'ROLE_NOT_FOUND');

            const new_role = await this.createRole({
                name: new_name,
                description: `Duplicated from ${source_role.name}`,
                permissions: source_role.permissions.map(p => p.id),
                is_active: source_role.is_active,
                priority: source_role.priority,
                created_by
            });

            logger.info(`Role duplicated: ${role_id} → ${new_role.id} by ${created_by}`);
            return new_role;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Duplicate role error:', error);
            throw new AppError('Failed to duplicate role', 500, 'DUPLICATE_ROLE_ERROR');
        }
    }

    /**
     * Role id for new self-service signups (registration + OAuth).
     * Prefer DEFAULT_REGISTRATION_ROLE_ID in .env; otherwise look up by name (default: "Student" from seed).
     */
    async getDefaultRegistrationRoleId() {
        const explicitId = process.env.DEFAULT_REGISTRATION_ROLE_ID?.trim();
        if (explicitId) {
            const byId = await Role.findByPk(explicitId);
            if (byId) return byId.id;
            logger.warn(`[RBAC] DEFAULT_REGISTRATION_ROLE_ID=${explicitId} not found; using name lookup`);
        }
        const roleName = process.env.DEFAULT_REGISTRATION_ROLE_NAME?.trim() || 'Student';
        // MariaDB/MySQL have no ILIKE — use LOWER(name) = LOWER(:name) for case-insensitive match
        const role = await Role.findOne({
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        Op.eq,
                        roleName.toLowerCase()
                    ),
                    { is_active: true },
                ],
            },
        });
        if (!role) {
            throw new AppError(
                `Default registration role "${roleName}" not found. Run RBAC setup (e.g. npm run rbac:setup) or set DEFAULT_REGISTRATION_ROLE_ID.`,
                503,
                'DEFAULT_ROLE_MISSING'
            );
        }
        return role.id;
    }

    // ─────────────────────────────────────────────────────────────
    //  CACHE MANAGEMENT
    // ─────────────────────────────────────────────────────────────

    /**
     * ✅ NEW: Cache-only invalidation — NO token blacklisting.
     * Used by updateRole (metadata change) and deleteRole.
     *
     * @param {string} role_id
     */
    async _clearRoleCacheOnly(role_id) {
        try {
            const redis = await this._getRedisClient();
            if (!redis) return;

            await redis.del(`${this.CACHE_PREFIX.ROLE_DATA}${role_id}`);
            await redis.del(`${this.CACHE_PREFIX.ROLE_PERMISSIONS}${role_id}`);

            const users = await User.findAll({
                where: { role_id: role_id },
                attributes: ['user_id'],
                raw: true
            });

            for (const user of users) {
                await this.clearUserCache(user.user_id);
            }

            await this.clearAllRolesListCache();
            logger.info(`Cache-only cleared for role: ${role_id} (${users.length} users affected)`);
        } catch (error) {
            logger.warn('_clearRoleCacheOnly error (non-critical):', error.message);
        }
    }

    /**
     * ✅ FIXED: Invalidate caches AND blacklist tokens.
     * Called ONLY when permissions change (assign / remove).
     *
     * Scoping rules:
     *  - ONLY users with role_id = role_id are processed
     *  - changed_by_user_id is skipped (admin keeps their token)
     *  - String normalization prevents ID type-mismatch bugs
     *
     * @param {string}      role_id
     * @param {string|null} changed_by_user_id - Admin who made the change (skipped)
     * @param {Object}      [opts]          - Forwarded to _blacklistUserTokens
     */
    async clearRoleCache(role_id, changed_by_user_id = null, opts = {}) {
        try {
            const redis = await this._getRedisClient();
            if (!redis) return;

            // 1. Invalidate role-level caches
            await redis.del(`${this.CACHE_PREFIX.ROLE_DATA}${role_id}`);
            await redis.del(`${this.CACHE_PREFIX.ROLE_PERMISSIONS}${role_id}`);
            logger.info(`Cleared permission caches for role: ${role_id}`);

            // 2. Find users belonging to this role only
            const users = await User.findAll({
                where: { role_id: role_id },
                attributes: ['user_id'],
                raw: true
            });

            // ✅ FIX: Normalize admin ID to string to prevent type-mismatch
            // e.g. UUID from JWT might be string, DB might return same UUID
            // but === fails if one is wrapped differently
            const skip_id = changed_by_user_id ? String(changed_by_user_id) : null;

            logger.info(`Processing ${users.length} user(s) for role ${role_id} (skipping admin: ${skip_id || 'none'})`);

            for (const user of users) {
                const user_id = String(user.user_id);

                // Always clear their caches
                await this.clearUserCache(user_id);

                // ✅ FIX: Skip check happens HERE (caller level), not buried inside
                // _blacklistUserTokens, so it is reliable and auditable
                if (skip_id && user_id === skip_id) {
                    logger.info(`[blacklist] Skipping change author: ${user_id} — token preserved`);
                    continue;
                }

                // Blacklist this user's tokens
                await this._blacklistUserTokens(
                    user_id,
                    changed_by_user_id,
                    { reason: 'role_permissions_updated', revoked_by: changed_by_user_id, ...opts }
                );
            }

            // 3. Invalidate paginated role-list cache
            await this.clearAllRolesListCache();

        } catch (error) {
            logger.warn('clearRoleCache error (non-critical):', error.message);
        }
    }

    async clearAllRolesListCache() {
        try {
            const redis = await this._getRedisClient();
            if (!redis) return;

            const pattern = `${this.CACHE_PREFIX.ALL_ROLES}*`;
            let cursor = 0, deleted_count = 0, iterations = 0;
            const max_iterations = 1000;

            do {
                iterations++;
                if (iterations > max_iterations) { logger.warn('Max iterations in clearAllRolesListCache'); break; }

                const reply = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });

                let new_cursor, keys;
                if (Array.isArray(reply)) { [new_cursor, keys] = reply; }
                else if (reply && typeof reply === 'object') { new_cursor = reply.cursor; keys = reply.keys; }
                else { logger.error('Unexpected SCAN response:', reply); break; }

                cursor = typeof new_cursor === 'string' ? parseInt(new_cursor, 10) : new_cursor;

                if (keys?.length > 0) {
                    await redis.del(...keys);
                    deleted_count += keys.length;
                }
            } while (cursor !== 0);

            if (deleted_count > 0) logger.info(`Cleared ${deleted_count} all-roles cache entries (${iterations} iterations)`);
        } catch (error) {
            logger.error('clearAllRolesListCache error:', error.message);
        }
    }

    async clearUserCache(user_id) {
        try {
            const redis = await this._getRedisClient();
            if (!redis) return;

            await Promise.all([
                redis.del(`${this.CACHE_PREFIX.USER_PERMISSIONS}${user_id}`),
                redis.del(`${this.CACHE_PREFIX.USER_ROLE}${user_id}`),
                redis.del(`${this.CACHE_PREFIX.USER_PROFILE}${user_id}`)
            ]);

            logger.debug(`Cleared cache for user: ${user_id}`);
        } catch (error) {
            logger.warn('clearUserCache error (non-critical):', error.message);
        }
    }

    async getUserPermissionProfile(user_id) {
        try {
            const user = await User.findByPk(user_id, {
                attributes: ['user_id', 'email', 'full_name', 'is_active', 'is_verified', 'role_id'],
                include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'description', 'priority', 'is_active'] }]
            });

            if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

            if (!user.role) {
                return {
                    user_id: user.user_id,
                    user: { email: user.email, full_name: user.full_name, is_active: user.is_active, is_verified: user.is_verified },
                    role: null, permissions: [], total_permissions: 0
                };
            }

            const permissions = await Permission.findAll({
                include: [{
                    model: Role, as: 'roles',
                    where: { id: user.role_id }, attributes: [], through: { attributes: [] }
                }],
                order: [['label', 'ASC']]
            });

            return {
                user_id: user.user_id,
                user: { email: user.email, full_name: user.full_name, is_active: user.is_active, is_verified: user.is_verified },
                role: user.role.toJSON(),
                permissions: permissions.map(p => p.toJSON()),
                total_permissions: permissions.length,
                last_updated: Date.now()
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('getUserPermissionProfile error:', error);
            throw new AppError('Failed to retrieve permission profile', 500, 'GET_PROFILE_ERROR');
        }
    }

    async clearUserPermissionCache(user_id) {
        try {
            const redis = await this._getRedisClient();
            if (!redis) return;

            await redis.del(`user_permissions:${user_id}`);
            await redis.del(`user_role:${user_id}`);
            logger.info(`Cleared permission cache for user: ${user_id}`);
        } catch (error) {
            logger.error('clearUserPermissionCache error:', error);
        }
    }
}

module.exports = new RoleService();
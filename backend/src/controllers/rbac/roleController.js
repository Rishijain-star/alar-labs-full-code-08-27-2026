const roleService = require('../../services/rbac/roleService');
const auditService = require('../../services/auditService');
const logger = require('../../lib/logger');
const { AppError } = require('../../middleware/errorHandler');
const { Validator } = require('node-input-validator');
const response = require('../../utils/response');

/**
 * Role Controller
 * Handles all role management operations including permissions and routes
 */
class RoleController {
    /**
     * GET /api/rbac/roles
     * Get all roles with pagination and filters
     */
    async getAllRoles(req, res) {
        try {
            const v = new Validator(req.query, {
                page: 'integer|min:1',
                limit: 'integer|min:1|max:1000',
                search: 'string',
                status: 'string|in:active,inactive',
                sort_by: 'string|in:name,created_at,updated_at',
                sort_order: 'string|in:asc,desc'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const {
                page = 1,
                limit = 20,
                search,
                status,
                sort_by = 'created_at',
                sort_order = 'desc'
            } = req.query;

            const result = await roleService.getAllRoles({
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                status,
                sort_by,
                sort_order
            });

            return response.success(
                res,
                'Roles retrieved successfully',
                200,
                result
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get all roles error:', error);
            return response.fail(res, 'Failed to retrieve roles', 500);
        }
    }

    /**
     * GET /api/rbac/roles/:roleId
     * Get single role by ID with permissions
     */
    async getRoleById(req, res) {
        try {
            const v = new Validator(req.params, {
                role_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const role = await roleService.getRoleById(role_id);

            return response.success(
                res,
                'Role retrieved successfully',
                200,
                { role }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get role by ID error:', error);
            return response.fail(res, 'Failed to retrieve role', 500);
        }
    }

    /**
     * GET /api/rbac/roles/:role_id/complete
     * Get complete role details with permissions, routes, and groups
     */
    async getRoleComplete(req, res) {
        try {
            const v = new Validator(req.params, {
                role_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const role = await roleService.getRoleComplete(role_id);

            return response.success(
                res,
                'Complete role details retrieved successfully',
                200,
                { role }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get complete role error:', error);
            return response.fail(res, 'Failed to retrieve complete role details', 500);
        }
    }

    /**
     * POST /api/rbac/roles
     * Create new role
     */
    async createRole(req, res) {
        try {
            const v = new Validator(req.body, {
                name: 'required|string|minLength:2|maxLength:100',
                description: 'string|maxLength:500',
                permissions: 'array',
                'permissions.*': 'string',
                is_active: 'boolean',
                priority: 'integer|min:0'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const {
                name,
                description,
                permissions = [],
                is_active = true,
                priority = 0
            } = req.body;

            const role = await roleService.createRole({
                name,
                description,
                permissions,
                is_active,
                priority,
                created_by: req.user.user_id
            });

            // Log activity
            await auditService.log({
                user_id: req.user.user_id,
                action: 'ROLE_CREATE',
                resource_type: 'ROLE',
                resource_id: role.id,
                metadata: {
                    name: role.name
                },
                success: true
            });

            return response.success(
                res,
                'Role created successfully',
                201,
                { role }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Create role error:', error);
            return response.fail(res, 'Failed to create role', 500);
        }
    }

    /**
     * PUT /api/rbac/roles/:roleId
     * Update role details
     */
    async updateRole(req, res) {
        try {
            const paramsValidator = new Validator(req.params, {
                role_id: 'required|string'
            });
            const bodyValidator = new Validator(req.body, {
                name: 'string|minLength:2|maxLength:100',
                description: 'string|maxLength:500',
                is_active: 'boolean',
                priority: 'integer|min:0'
            });

            const paramsMatched = await paramsValidator.check();
            const bodyMatched = await bodyValidator.check();

            if (!paramsMatched) {
                const firstErrorKey = Object.keys(paramsValidator.errors)[0];
                return response.fail(res, paramsValidator.errors[firstErrorKey].message, 400);
            }

            if (!bodyMatched) {
                const firstErrorKey = Object.keys(bodyValidator.errors)[0];
                return response.fail(res, bodyValidator.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const updateData = {
                ...req.body,
                updated_by: req.user.user_id
            };

            const role = await roleService.updateRole(role_id, updateData);

            // Log activity
            await auditService.log({
                user_id: req.user.user_id,
                action: 'ROLE_UPDATE',
                resource_type: 'ROLE',
                resource_id: role_id,
                metadata: {
                    updates: Object.keys(req.body)
                },
                success: true
            });

            return response.success(
                res,
                'Role updated successfully',
                200,
                { role }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Update role error:', error);
            return response.fail(res, 'Failed to update role', 500);
        }
    }

    /**
     * DELETE /api/rbac/roles/:role_id
     * Delete role
     */
    async deleteRole(req, res) {
        try {
            const v = new Validator(req.params, {
                role_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            await roleService.deleteRole(role_id, req.user.user_id);

            // Log activity
            await auditService.log({
                user_id: req.user.user_id,
                action: 'ROLE_DELETE',
                resource_type: 'ROLE',
                resource_id: role_id,
                success: true
            });

            return response.success(
                res,
                'Role deleted successfully',
                200
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Delete role error:', error);
            return response.fail(res, 'Failed to delete role', 500);
        }
    }

    /* =====================================================
       PERMISSION MANAGEMENT ENDPOINTS
    ===================================================== */

    /**
     * POST /api/rbac/roles/:roleId/permissions
     * Assign permissions to role
     */
    async assignPermissionsToRole(req, res) {
        try {
            const paramsValidator = new Validator(req.params, {
                role_id: 'required|string'
            });

            const bodyValidator = new Validator(req.body, {
                permission_ids: 'required|array',
                'permission_ids.*': 'string'
            });

            const paramsMatched = await paramsValidator.check();
            const bodyMatched = await bodyValidator.check();

            if (!paramsMatched) {
                const firstErrorKey = Object.keys(paramsValidator.errors)[0];
                return response.fail(res, paramsValidator.errors[firstErrorKey].message, 400);
            }

            if (!bodyMatched) {
                const firstErrorKey = Object.keys(bodyValidator.errors)[0];
                return response.fail(res, bodyValidator.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const { permission_ids } = req.body;

            const result = await roleService.assignPermissionsToRole(
                role_id,
                permission_ids,
                req.user.user_id
            );

            // Log activity
            await auditService.log({
                user_id: req.user.user_id,
                action: 'ROLE_PERMISSION_ASSIGN',
                resource_type: 'ROLE',
                resource_id: role_id,
                metadata: {
                    permissionCount: permission_ids.length
                },
                success: true
            });

            return response.success(
                res,
                'Permissions assigned successfully',
                200,
                result
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Assign permissions error:', error);
            return response.fail(res, 'Failed to assign permissions', 500);
        }
    }

    /**
     * DELETE /api/rbac/roles/:role_id/permissions/:permission_id
     * Remove permission from role
     */
    async removePermissionFromRole(req, res) {
        try {
            const v = new Validator(req.params, {
                role_id: 'required|string',
                permission_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const { role_id, permission_id } = req.params;

            await roleService.removePermissionFromRole(
                role_id,
                permission_id,
                req.user.user_id
            );

            await auditService.log({
                user_id: req.user.user_id,
                action: 'ROLE_PERMISSION_REMOVE',
                resource_type: 'ROLE',
                resource_id: role_id,
                metadata: {
                    permission_id
                },
                success: true
            });

            return response.success(
                res,
                'Permission removed successfully',
                200
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Remove permission error:', error);
            return response.fail(res, 'Failed to remove permission', 500);
        }
    }

    /**
     * GET /api/rbac/roles/:role_id/permissions
     * Get all permissions for a specific role
     */
    async getRolePermissions(req, res) {
        try {
            const v = new Validator(req.params, {
                role_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const permissions = await roleService.getRolePermissions(role_id);

            return response.success(
                res,
                'Role permissions retrieved successfully',
                200,
                { permissions }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get role permissions error:', error);
            return response.fail(res, 'Failed to retrieve role permissions', 500);
        }
    }

    /* =====================================================
       ROUTE MANAGEMENT ENDPOINTS
    ===================================================== */

    /**
     * POST /api/rbac/roles/:roleId/routes
     * Assign routes to role
     */
    async assignRoutesToRole(req, res) {
        try {
            const paramsValidator = new Validator(req.params, {
                role_id: 'required|string'
            });

            const bodyValidator = new Validator(req.body, {
                route_ids: 'required|array',
                'route_ids.*': 'string'
            });

            const paramsMatched = await paramsValidator.check();
            const bodyMatched = await bodyValidator.check();

            if (!paramsMatched) {
                const firstErrorKey = Object.keys(paramsValidator.errors)[0];
                return response.fail(res, paramsValidator.errors[firstErrorKey].message, 400);
            }

            if (!bodyMatched) {
                const firstErrorKey = Object.keys(bodyValidator.errors)[0];
                return response.fail(res, bodyValidator.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const { route_ids } = req.body;

            const result = await roleService.assignRoutesToRole(
                role_id,
                route_ids,
                req.user.user_id
            );

            await auditService.log({
                user_id: req.user.user_id,
                action: 'ROUTES_ASSIGNED_TO_ROLE',
                resource_type: 'ROLE',
                resource_id: role_id,
                metadata: {
                    route_count: route_ids.length
                },
                success: true
            });

            return response.success(
                res,
                'Routes assigned successfully',
                200,
                result
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Assign routes to role error:', error);
            return response.fail(res, 'Failed to assign routes', 500);
        }
    }

    /**
     * DELETE /api/rbac/roles/:role_id/routes/:route_id
     * Remove route from role
     */
    async removeRouteFromRole(req, res) {
        try {
            const v = new Validator(req.params, {
                role_id: 'required|string',
                route_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const { role_id, route_id } = req.params;

            await roleService.removeRouteFromRole(
                role_id,
                route_id,
                req.user.user_id
            );

            await auditService.log({
                user_id: req.user.user_id,
                action: 'ROUTE_REMOVED_FROM_ROLE',
                resource_type: 'ROLE',
                resource_id: role_id,
                metadata: {
                    route_id
                },
                success: true
            });

            return response.success(
                res,
                'Route removed successfully',
                200
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Remove route from role error:', error);
            return response.fail(res, 'Failed to remove route', 500);
        }
    }

    /**
     * GET /api/rbac/roles/:role_id/routes
     * Get all routes for a specific role
     */
    async getRoleRoutes(req, res) {
        try {
            const v = new Validator(req.params, {
                role_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const routes = await roleService.getRoleRoutes(role_id);

            return response.success(
                res,
                'Role routes retrieved successfully',
                200,
                { routes }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get role routes error:', error);
            return response.fail(res, 'Failed to retrieve role routes', 500);
        }
    }

    /* =====================================================
       USER ACCESS ENDPOINTS
    ===================================================== */

    /**
     * GET /api/rbac/roles/:roleId/users
     * Get all users assigned to a role
     */
    async getRoleUsers(req, res) {
        try {
            const paramsValidator = new Validator(req.params, {
                role_id: 'required|string'
            });

            const queryValidator = new Validator(req.query, {
                page: 'integer|min:1',
                limit: 'integer|min:1|max:100'
            });

            const paramsMatched = await paramsValidator.check();
            const queryMatched = await queryValidator.check();

            if (!paramsMatched) {
                const firstErrorKey = Object.keys(paramsValidator.errors)[0];
                return response.fail(res, paramsValidator.errors[firstErrorKey].message, 400);
            }

            if (!queryMatched) {
                const firstErrorKey = Object.keys(queryValidator.errors)[0];
                return response.fail(res, queryValidator.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const result = await roleService.getRoleUsers(role_id, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return response.success(
                res,
                'Role users retrieved successfully',
                200,
                result
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get role users error:', error);
            return response.fail(res, 'Failed to retrieve role users', 500);
        }
    }

    /**
     * POST /api/rbac/roles/:role_id/duplicate
     * Duplicate an existing role
     */
    async duplicateRole(req, res) {
        try {
            const paramsValidator = new Validator(req.params, {
                role_id: 'required|string'
            });

            const bodyValidator = new Validator(req.body, {
                new_name: 'required|string|minLength:2|maxLength:100'
            });

            const paramsMatched = await paramsValidator.check();
            const bodyMatched = await bodyValidator.check();

            if (!paramsMatched) {
                const firstErrorKey = Object.keys(paramsValidator.errors)[0];
                return response.fail(res, paramsValidator.errors[firstErrorKey].message, 400);
            }

            if (!bodyMatched) {
                const firstErrorKey = Object.keys(bodyValidator.errors)[0];
                return response.fail(res, bodyValidator.errors[firstErrorKey].message, 400);
            }

            const { role_id } = req.params;
            const { new_name } = req.body;

            const role = await roleService.duplicateRole(
                role_id,
                new_name,
                req.user.user_id
            );

            await auditService.log({
                user_id: req.user.user_id,
                action: 'ROLE_DUPLICATED',
                resource_type: 'ROLE',
                resource_id: role.id,
                metadata: {
                    source_role_id: role_id,
                    new_name
                },
                success: true
            });

            return response.success(
                res,
                'Role duplicated successfully',
                201,
                { role }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Duplicate role error:', error);
            return response.fail(res, 'Failed to duplicate role', 500);
        }
    }
}

module.exports = new RoleController();
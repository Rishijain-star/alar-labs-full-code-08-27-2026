const permissionService = require('../../services/rbac/permissionService');
const auditService = require('../../services/auditService');
const logger = require('../../lib/logger');
const {
    AppError
} = require('../../middleware/errorHandler');
const {
    Validator
} = require('node-input-validator');
const response = require('../../utils/response');

/**
 * Permission Controller
 * Handles all permission management operations
 */
class PermissionController {
    /**
     * GET /api/rbac/permissions
     * Get all permissions with pagination and filters
     */
    async getAllPermissions(req, res) {
        try {
            const v = new Validator(req.query, {
                page: 'integer|min:1',
                limit: 'integer|min:1|max:1000',
                search: 'string',
                group_id: 'string',
                sort_by: 'string|in:label,created_at',
                sort_order: 'string|in:asc,desc'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const {
                page = 1,
                limit = 100,
                search,
                group_id,
                sort_by = 'created_at',
                sort_order = 'asc'
            } = req.query;

            const result = await permissionService.getAllPermissions({
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                group_id,
                sort_by,
                sort_order
            });

            return response.success(
                res,
                'Permissions retrieved successfully',
                200,
                result
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get all permissions error:', error);
            return response.fail(res, 'Failed to retrieve permissions', 500);
        }
    }

    /**
     * GET /api/rbac/permissions/:permission_id
     * Get single permission by ID
     */
    async getPermissionById(req, res) {
        try {
            const v = new Validator(req.params, {
                permission_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const {
                permission_id
            } = req.params;
            const permission = await permissionService.getPermissionById(permission_id);

            return response.success(
                res,
                'Permission retrieved successfully',
                200, {
                permission
            }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get permission by ID error:', error);
            return response.fail(res, 'Failed to retrieve permission', 500);
        }
    }

    /**
     * POST /api/rbac/permissions
     * Create new permission
     */
    async createPermission(req, res) {
        try {
            const v = new Validator(req.body, {
                id: 'required|string|minLength:2|maxLength:100',
                label: 'required|string|minLength:2|maxLength:100',
                description: 'string|maxLength:500',
                resource: 'string|maxLength:100',
                action: 'string|maxLength:50'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const {
                id,
                label,
                description,
                resource,
                action
            } = req.body;

            const permission = await permissionService.createPermission({
                id,
                label,
                description,
                resource,
                action,
                created_by: req.user.user_id
            });

            // Log activity
            await auditService.log({
                user_id: req.user.user_id,
                action: 'PERMISSION_CREATE',
                resource_type: 'PERMISSION',
                resource_id: permission.id,
                metadata: {
                    label: permission.label,
                    code: permission.code
                },
                success: true
            });

            return response.success(
                res,
                'Permission created successfully',
                201, {
                permission
            }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Create permission error:', error);
            return response.fail(res, 'Failed to create permission', 500);
        }
    }

    /**
     * PUT /api/rbac/permissions/:permission_id
     * Update permission details
     */
    async updatePermission(req, res) {
        try {
            const paramsValidator = new Validator(req.params, {
                permission_id: 'required|string'
            });

            const bodyValidator = new Validator(req.body, {
                label: 'string|minLength:2|maxLength:100',
                description: 'string|maxLength:500',
                group_id: 'string',
                resource: 'string|maxLength:100',
                action: 'string|maxLength:50'
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

            const {
                permission_id
            } = req.params;
            const updateData = {
                ...req.body,
                updated_by: req.user.user_id
            };

            const permission = await permissionService.updatePermission(
                permission_id,
                updateData
            );

            // Log activity
            await auditService.log({
                user_id: req.user.user_id,
                action: 'PERMISSION_UPDATE',
                resource_type: 'PERMISSION',
                resource_id: permission_id,
                metadata: {
                    label: permission.label,
                    code: permission.code
                },
                success: true
            });

            return response.success(
                res,
                'Permission updated successfully',
                200, {
                permission
            }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Update permission error:', error);
            return response.fail(res, 'Failed to update permission', 500);
        }
    }

    /**
     * DELETE /api/rbac/permissions/:permission_id
     * Delete permission
     */
    async deletePermission(req, res) {
        try {
            const v = new Validator(req.params, {
                permission_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const {
                permission_id
            } = req.params;
            await permissionService.deletePermission(permission_id, req.user.user_id);

            // Log activity
            await auditService.log({
                user_id: req.user.user_id,
                action: 'PERMISSION_DELETE',
                resource_type: 'PERMISSION',
                resource_id: permission_id,
                success: true
            });

            return response.success(
                res,
                'Permission deleted successfully',
                200
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Delete permission error:', error);
            return response.fail(res, 'Failed to delete permission', 500);
        }
    }

    /**
     * GET /api/rbac/permissions/group/:group_id
     * Get all permissions in a specific group
     */
    async getPermissionsByGroup(req, res) {
        try {
            const v = new Validator(req.params, {
                group_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const {
                group_id
            } = req.params;
            const permissions = await permissionService.getPermissionsByGroup(group_id);

            return response.success(
                res,
                'Permissions retrieved successfully',
                200, {
                permissions
            }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get permissions by group error:', error);
            return response.fail(res, 'Failed to retrieve permissions', 500);
        }
    }

    /**
     * GET /api/rbac/permissions/:permission_id/roles
     * Get all roles that have a specific permission
     */
    async getPermissionRoles(req, res) {
        try {
            const v = new Validator(req.params, {
                permission_id: 'required|string'
            });

            const matched = await v.check();
            if (!matched) {
                const firstErrorKey = Object.keys(v.errors)[0];
                return response.fail(res, v.errors[firstErrorKey].message, 400);
            }

            const {
                permission_id
            } = req.params;
            const roles = await permissionService.getPermissionRoles(permission_id);

            return response.success(
                res,
                'Permission roles retrieved successfully',
                200, {
                roles
            }
            );
        } catch (error) {
            if (error instanceof AppError) {
                return response.fail(res, error.message, error.statusCode);
            }
            logger.error('Get permission roles error:', error);
            return response.fail(res, 'Failed to retrieve permission roles', 500);
        }
    }
}

module.exports = new PermissionController();
const ownerService = require("../../services/common/ownerService");
const roleService = require("../../services/rbac/roleService");
const learningService = require("../../services/learningService");

const totpService = require("../../services/totpService");
const logger = require("../../lib/logger");
const { AppError } = require("../../middleware/errorHandler");
const { Validator } = require("node-input-validator");
const response = require("../../utils/response");
const auditService = require("../../services/auditService");
const emailService = require("../../services/emailService");

/**
 * Owner Controller - User Profile & Security Management
 * All endpoints require authentication
 */
class OwnerController {
  // ==========================================
  // PROFILE MANAGEMENT
  // ==========================================

  /**
   * GET /api/owner/me
   * Get current user profile
   */
  async getCurrentUser(req, res) {
    try {
      const user_id = req.user.user_id;
      const profile = await ownerService.getUserProfile(user_id);

      return response.success(res, "Profile retrieved successfully", 200, {
        user: profile,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get current user error:", error);
      return response.fail(res, "Failed to get user profile", 500);
    }
  }

  async updateCurrentUser(req, res) {
    try {
      const user_id = req.user.user_id;
      const { full_name, phone, mobile, city, state, country } = req.body;
      const targetPhone = phone || mobile;

      const v = new Validator(
        {
          full_name,
          phone: targetPhone || undefined,
          city,
          state,
          country,
        },
        {
          full_name: "sometimes|string|minLength:2|maxLength:100",
          phone: "sometimes|string|minLength:10|maxLength:15",
          city: "sometimes|string|maxLength:100",
          state: "sometimes|string|maxLength:100",
          country: "sometimes|string|maxLength:100",
        }
      );

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }
      let profile_image;
      // ✅ Handle profile image upload

      if (req.file) {
        profile_image = req.file.buffer;
      }

      const result = await ownerService.updateProfile(user_id, {
        full_name,
        phone: targetPhone,
        profile_image,
        city,
        state,
        country,
      });

      return response.success(res, result.message, 200, result);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Update current user error:", error);
      return response.fail(res, "Failed to update profile", 500);
    }
  }

  /**
   * GET /api/owner/users
   * Get all users with pagination and filters
   */
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, role_id, status } = req.query;

      const users = await ownerService.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        role_id,
        status,
      });

      return response.success(
        res,
        "All users retrieved successfully",
        200,
        users,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get all users error:", error);
      return response.fail(res, "Failed to get users", 500);
    }
  }

  async getUserById(req, res) {
    try {
      const user_id = req.params.user_id;
      const profile = await ownerService.getUserProfile(user_id);
      return response.success(res, "User profile retrieved successfully", 200, {
        profile,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get user profile error:", error);
      return response.fail(res, "Failed to get user profile", 500);
    }
  }

  async updateUserById(req, res) {
    try {
      const v = new Validator(
        { ...req.params, ...req.body },
        {
          user_id: "required|string",
          full_name: "string|minLength:2|maxLength:100",
          phone: "string|minLength:10|maxLength:15",
          is_active: "boolean",
        },
      );

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const { user_id } = req.params;
      const data = await ownerService.updateUserById(user_id, req.body || {});
      return response.success(res, "User updated successfully", 200, { user: data });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Update user by id error:", error);
      return response.fail(res, "Failed to update user", 500);
    }
  }

  async deleteUserById(req, res) {
    try {
      const { user_id } = req.params;
      const admin_user_id = req.user.user_id;

      if (user_id === admin_user_id) {
        return response.fail(
          res,
          "You cannot delete your own account from here",
          403,
        );
      }

      const result = await ownerService.deleteUserById(user_id);
      return response.success(res, result.message, 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Delete user by id error:", error);
      return response.fail(res, "Failed to delete user", 500);
    }
  }

  async bulkDeleteUsers(req, res) {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return response.fail(res, "No user IDs provided", 400);
      }

      const admin_user_id = req.user.user_id;
      const filteredIds = userIds.filter((id) => id !== admin_user_id);

      const result = await ownerService.bulkDeleteUsers(filteredIds);
      return response.success(res, result.message, 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Bulk delete users error:", error);
      return response.fail(res, "Failed to delete users", 500);
    }
  }

  /**
   * PUT /api/owner/profile
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const v = new Validator(req.body, {
        full_name: "string|minLength:2|maxLength:100",
        phone: "string|minLength:10|maxLength:15",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const result = await ownerService.updateProfile(user_id, req.body);

      return response.success(res, result.message, 200, result);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Update profile error:", error);
      return response.fail(res, "Failed to update profile", 500);
    }
  }

  /**
   * POST /api/owner/email/update-request
   * Request email update
   */
  async requestEmailUpdate(req, res) {
    try {
      const v = new Validator(req.body, {
        new_email: "required|email",
        password: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { new_email, password } = req.body;

      const result = await ownerService.requestEmailUpdate(
        user_id,
        new_email,
        password,
      );

      return response.success(res, result.message, 200, {
        otp_token: result.otp_token,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Request email update error:", error);
      return response.fail(res, "Failed to request email update", 500);
    }
  }

  /**
   * POST /api/owner/email/update-verify
   * Verify and update email
   */
  async verifyEmailUpdate(req, res) {
    try {
      const v = new Validator(req.body, {
        otp_token: "required|string",
        otp: "required|string|length:6",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { otp_token, otp } = req.body;

      const result = await ownerService.verifyEmailUpdate(
        user_id,
        otp_token,
        otp,
      );

      return response.success(res, result.message, 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Verify email update error:", error);
      return response.fail(res, "Failed to update email", 500);
    }
  }

  /**
   * DELETE /api/owner/account
   * Delete user account
   */
  async deleteAccount(req, res) {
    try {
      const v = new Validator(req.body, {
        password: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { password } = req.body;
      const result = await ownerService.deleteAccount(user_id, password);

      return response.success(res, result.message, 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Delete account error:", error);
      return response.fail(res, "Failed to delete account", 500);
    }
  }

  // ==========================================
  // PASSWORD MANAGEMENT
  // ==========================================

  /**
   * POST /api/owner/change-password
   * Change password
   */
  async changePassword(req, res) {
    try {
      const v = new Validator(req.body, {
        old_password: "required|string|minLength:8",
        new_password: "required|string|minLength:8|maxLength:128",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { old_password, new_password } = req.body;

      if (old_password === new_password) {
        return response.fail(
          res,
          "New password must be different from old password",
          400,
        );
      }

      const result = await ownerService.changePassword(
        user_id,
        old_password,
        new_password,
      );
      await emailService.send(
        result.email,
        `Your password has been changed. If this was not you, please contact support.`,
        "password_changed",
      );
      return response.success(res, result.message, 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Change password error:", error);
      return response.fail(res, "Failed to change password", 500);
    }
  }

  // ==========================================
  // MFA MANAGEMENT
  // ==========================================

  /**
   * POST /api/owner/mfa/enable/start
   * Start MFA setup
   */
  async enableMfaStart(req, res) {
    try {
      const user_id = req.user.user_id;
      const { qr_code, backup_codes } = await ownerService.enableMfaStart(user_id);

      return response.success(res, "MFA setup initiated", 200, {
        qr_code,
        backup_codes,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Enable MFA start error:", error);
      return response.fail(res, "Failed to start MFA setup", 500);
    }
  }

  /**
   * POST /api/owner/mfa/enable/complete
   * Complete MFA setup
   */
  async enableMfaComplete(req, res) {
    try {
      const v = new Validator(req.body, {
        code: "required|string|length:6",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { code } = req.body;

      const result = await ownerService.enableMfaVerify(user_id, code);

      return response.success(res, result.message, 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Enable MFA complete error:", error);
      return response.fail(res, "Failed to complete MFA setup", 500);
    }
  }

  /**
   * POST /api/owner/mfa/disable
   * Disable MFA
   */
  async disableMfa(req, res) {
    try {
      const v = new Validator(req.body, {
        password: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { password } = req.body;

      const result = await ownerService.disableMfa(user_id, password);

      return response.success(res, result.message, 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Disable MFA error:", error);
      return response.fail(res, "Failed to disable MFA", 500);
    }
  }

  /**
   * GET /api/owner/mfa/status
   * Get MFA status
   */
  async getMfaStatus(req, res) {
    try {
      const user_id = req.user.user_id;
      const status = await totpService.getMfaStatus(user_id);

      return response.success(
        res,
        "MFA status retrieved successfully",
        200,
        status,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get MFA status error:", error);
      return response.fail(res, "Failed to get MFA status", 500);
    }
  }

  /**
   * POST /api/owner/mfa/backup-codes/regenerate
   * Regenerate backup codes
   */
  async regenerateBackupCodes(req, res) {
    try {
      const user_id = req.user.user_id;
      const result = await ownerService.regenerateBackupCodes(user_id);

      return response.success(res, result.message, 200, {
        backup_codes: result.backupCodes,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Regenerate backup codes error:", error);
      return response.fail(res, "Failed to regenerate backup codes", 500);
    }
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  /**
   * GET /api/owner/sessions
   * Get all sessions
   */
  async getSessions(req, res) {
    try {
      const user_id = req.user.user_id;
      const current_session_id =
        req.cookies[require("../../config").session.cookieName] ||
        req.query.session_id;

      const sessions = await ownerService.getUserSessions(
        user_id,
        current_session_id,
      );

      return response.success(res, "Sessions retrieved successfully", 200, {
        sessions,
        total: sessions.length,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get sessions error:", error);
      return response.fail(res, "Failed to get sessions", 500);
    }
  }

  /**
   * DELETE /api/owner/sessions/:sessionId
   * Delete specific session
   */
  async deleteSession(req, res) {
    try {
      const v = new Validator(req.params, {
        session_id: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { session_id } = req.params;

      await ownerService.deleteSession(user_id, session_id);

      return response.success(res, "Session deleted successfully", 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Delete session error:", error);
      return response.fail(res, "Failed to delete session", 500);
    }
  }

  /**
   * POST /api/owner/refresh
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const session_id =
        req.body.session_id ||
        req.cookies[require("../../config").session.cookieName];

      if (!session_id) {
        return response.fail(res, "Session not found", 401);
      }

      const result = await ownerService.refreshToken(session_id);

      return response.success(res, "Token refreshed successfully", 200, {
        access_token: result.access_token,
        expires_in: result.expires_in,
        permissions: result.permissions,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Refresh token error:", error);
      return response.fail(res, "Token refresh failed", 500);
    }
  }

  /**
   * POST /api/owner/logout
   * Logout from current session
   */
  async logout(req, res) {
    try {
      const session_id =
        req.body.session_id ||
        req.cookies[require("../../config").session.cookieName];
      const user_id = req.user?.user_id;

      // Extract the access token from the Authorization header
      const authHeader = req.headers["authorization"];
      const access_token = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (session_id && user_id) {
        await ownerService.logout(session_id, user_id, access_token);
      }

      res.clearCookie(require("../../config").session.cookieName);

      return response.success(res, "Logged out successfully", 200);
    } catch (error) {
      res.clearCookie(require("../../config").session.cookieName);
      return response.success(res, "Logged out successfully", 200);
    }
  }

  /**
   * POST /api/owner/logout-all
   * Logout from all devices
   */
  async logoutAll(req, res) {
    try {
      const user_id = req.user.user_id;
      const result = await ownerService.logoutAll(user_id);

      res.clearCookie(require("../../config").session.cookieName);

      return response.success(
        res,
        "Logged out from all devices successfully",
        200,
        {
          sessions_terminated: result.sessions_terminated,
        },
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Logout all error:", error);
      return response.fail(res, "Failed to logout from all devices", 500);
    }
  }

  /**
   * GET /api/owner/validate
   * Validate session
   */
  async validateSession(req, res) {
    try {
      const session_id =
        req.query.session_id ||
        req.cookies[require("../../config").session.cookieName];

      if (!session_id) {
        return response.success(res, "No session found", 200, {
          valid: false,
        });
      }

      const session = await require("../../services/sessionService").getSession(
        session_id,
      );

      if (!session) {
        return response.success(res, "Session expired", 200, {
          valid: false,
        });
      }

      return response.success(res, "Session is valid", 200, {
        valid: true,
        user_id: session.user_id,
        session_id,
      });
    } catch (error) {
      return response.success(res, "Validation failed", 200, {
        valid: false,
      });
    }
  }

  // ==========================================
  // DEVICE MANAGEMENT
  // ==========================================

  /**
   * GET /api/owner/devices
   * Get trusted devices
   */
  async getTrustedDevices(req, res) {
    try {
      const user_id = req.user.user_id;
      const result = await ownerService.getTrustedDevices(user_id);

      return response.success(
        res,
        "Trusted devices retrieved successfully",
        200,
        result,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get trusted devices error:", error);
      return response.fail(res, "Failed to get trusted devices", 500);
    }
  }

  /**
   * DELETE /api/owner/devices/:deviceId
   * Remove trusted device
   */
  async removeTrustedDevice(req, res) {
    try {
      const v = new Validator(req.params, {
        device_id: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { device_id } = req.params;

      await ownerService.removeTrustedDevice(user_id, device_id);

      return response.success(res, "Trusted device removed successfully", 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Remove trusted device error:", error);
      return response.fail(res, "Failed to remove trusted device", 500);
    }
  }

  // ==========================================
  // SECURITY & AUDIT
  // ==========================================

  /**
   * GET /api/owner/security/overview
   * Get security overview
   */
  async getSecurityOverview(req, res) {
    try {
      const user_id = req.user.user_id;
      const overview = await ownerService.getSecurityOverview(user_id);

      return response.success(
        res,
        "Security overview retrieved successfully",
        200,
        overview,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get security overview error:", error);
      return response.fail(res, "Failed to get security overview", 500);
    }
  }

  /**
   * GET /api/owner/audit-logs
   * Get audit logs
   */
  async getAuditLogs(req, res) {
    try {
      const v = new Validator(req.query, {
        page: "integer|min:1",
        limit: "integer|min:1|max:100",
        action: "string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { page, limit, action } = req.query;

      const logs = await ownerService.getAuditLogs(user_id, {
        page,
        limit,
        action,
      });

      return response.success(
        res,
        "Audit logs retrieved successfully",
        200,
        logs,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get audit logs error:", error);
      return response.fail(res, "Failed to get audit logs", 500);
    }
  }

  // ==========================================
  // IP WHITELIST
  // ==========================================

  /**
   * GET /api/owner/ip-whitelist
   * Get IP whitelist
   */
  async getIpWhitelist(req, res) {
    try {
      const user_id = req.user.user_id;
      const whitelist = await ownerService.getIpWhitelist(user_id);

      return response.success(
        res,
        "IP whitelist retrieved successfully",
        200,
        whitelist,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get IP whitelist error:", error);
      return response.fail(res, "Failed to get IP whitelist", 500);
    }
  }

  /**
   * POST /api/owner/ip-whitelist
   * Add IP to whitelist
   */
  async addIpToWhitelist(req, res) {
    try {
      const v = new Validator(req.body, {
        ip: "required|ip",
        description: "string|maxLength:255",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { ip, description } = req.body;

      await ownerService.addIpToWhitelist(user_id, ip, description);

      return response.success(res, "IP added to whitelist successfully", 200);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Add IP to whitelist error:", error);
      return response.fail(res, "Failed to add IP to whitelist", 500);
    }
  }

  /**
   * DELETE /api/owner/ip-whitelist/:ip
   * Remove IP from whitelist
   */
  async removeIpFromWhitelist(req, res) {
    try {
      const v = new Validator(req.params, {
        ip: "required|ip",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { ip } = req.params;

      await ownerService.removeIpFromWhitelist(user_id, ip);

      return response.success(
        res,
        "IP removed from whitelist successfully",
        200,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Remove IP from whitelist error:", error);
      return response.fail(res, "Failed to remove IP from whitelist", 500);
    }
  }

  /**
   * POST /api/owner/ip-whitelist/toggle
   * Toggle IP whitelist
   */
  async toggleIpWhitelist(req, res) {
    try {
      const v = new Validator(req.body, {
        enabled: "required|boolean",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const user_id = req.user.user_id;
      const { enabled } = req.body;

      await ownerService.toggleIpWhitelist(user_id, enabled);

      return response.success(
        res,
        `IP whitelist ${enabled ? "enabled" : "disabled"} successfully`,
        200,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Toggle IP whitelist error:", error);
      return response.fail(res, "Failed to toggle IP whitelist", 500);
    }
  }

  /**
   * GET /api/rbac/users/:userId/access-summary
   * Get complete access summary for a user
   */
  async getUserAccessSummary(req, res) {
    try {
      const v = new Validator(req.params, {
        user_id: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const { user_id } = req.params;

      // Ensure user can only view their own access or has admin permission
      if (
        user_id !== req.user.user_id &&
        !req.user.permissions?.includes("view_users")
      ) {
        return response.fail(res, "Unauthorized to view this user access", 403);
      }

      const access_summary = await roleService.getUserAccessSummary(user_id);

      return response.success(
        res,
        "User access summary retrieved successfully",
        200,
        access_summary,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get user access summary error:", error);
      return response.fail(res, "Failed to retrieve user access summary", 500);
    }
  }

  /**
   * GET /api/rbac/users/:userId/permissions
   * Get user's permissions
   */
  async getUserPermissions(req, res) {
    try {
      const v = new Validator(req.params, {
        user_id: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const { user_id } = req.params;

      if (
        user_id !== req.user.user_id &&
        !req.user.permissions?.includes("view_users")
      ) {
        return response.fail(res, "Unauthorized to view user permissions", 403);
      }

      const permissions = await roleService.getUserPermissions(user_id);

      return response.success(
        res,
        "User permissions retrieved successfully",
        200,
        { permissions },
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get user permissions error:", error);
      return response.fail(res, "Failed to retrieve user permissions", 500);
    }
  }

  /**
   * GET /api/rbac/users/:userId/routes
   * Get user's accessible routes
   */
  async getUserAccessibleRoutes(req, res) {
    try {
      const v = new Validator(req.params, {
        user_id: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const { user_id } = req.params;

      if (
        user_id !== req.user.user_id &&
        !req.user.permissions?.includes("view_users")
      ) {
        return response.fail(res, "Unauthorized to view user routes", 403);
      }

      const routes = await roleService.getUserAccessibleRoutes(user_id);

      return response.success(
        res,
        "User accessible routes retrieved successfully",
        200,
        { routes },
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get user accessible routes error:", error);
      return response.fail(
        res,
        "Failed to retrieve user accessible routes",
        500,
      );
    }
  }

  /**
   * GET /api/rbac/users/:userId/role
   * Get user's role details
   */
  async getUserRole(req, res) {
    try {
      const v = new Validator(req.params, {
        user_id: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const { user_id } = req.params;

      if (
        user_id !== req.user.user_id &&
        !req.user.permissions?.includes("view_users")
      ) {
        return response.fail(res, "Unauthorized to view user role", 403);
      }

      const role = await roleService.getUserRole(user_id);

      return response.success(res, "User role retrieved successfully", 200, {
        role,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get user role error:", error);
      return response.fail(res, "Failed to retrieve user role", 500);
    }
  }

  /**
   * GET /api/rbac/me/access-summary
   * Get current user's access summary
   */
  async getMyAccessSummary(req, res) {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          status: 401,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      const accessSummary = await roleService.getUserAccessSummary(user_id);

      return response.success(
        res,
        "Your access summary retrieved successfully",
        200,
        accessSummary,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get my access summary error:", error);
      return response.fail(res, "Failed to retrieve access summary", 500);
    }
  }

  /**
   * GET /api/owner/me/permissions
   * Get current user's permissions
   */
  async getMyPermissions(req, res) {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          status: 401,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      const permissions = await roleService.getUserPermissions(user_id);

      return response.success(
        res,
        "Your permissions retrieved successfully",
        200,
        { permissions },
      );
    } catch (error) {
      logger.error("Get my permissions error:", error);
      return response.fail(res, "Failed to retrieve permissions", 500);
    }
  }

  /**
   * GET /api/owner/me/role
   * Get current user's role (no admin permission required)
   */
  async getMyRole(req, res) {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          status: 401,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      const role = await roleService.getUserRole(user_id);

      return response.success(
        res,
        "Your role retrieved successfully",
        200,
        { role, roles: role ? [role] : [] },
      );
    } catch (error) {
      logger.error("Get my role error:", error);
      return response.fail(res, "Failed to retrieve role", 500);
    }
  }

  /**
   * GET /api/rbac/me/routes
   * Get current user's accessible routes
   */
  async getMyAccessibleRoutes(req, res) {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          status: 401,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      const routes = await roleService.getUserAccessibleRoutes(user_id);

      return response.success(
        res,
        "Your accessible routes retrieved successfully",
        200,
        { routes },
      );
    } catch (error) {
      logger.error("Get my accessible routes error:", error);
      return response.fail(res, "Failed to retrieve accessible routes", 500);
    }
  }

  /**
   * PUT /api/admin/users/:userId/role
   * Update user's role (Admin only)
   */
  async updateUserRole(req, res) {
    try {
      const v = new Validator(
        {
          ...req.params,
          ...req.body,
        },
        {
          user_id: "required|string",
          role_id: "required|string",
        },
      );

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const { user_id } = req.params;
      const { role_id } = req.body;
      const admin_user_id = req.user.user_id;

      // Prevent admin from changing their own role
      if (user_id === admin_user_id) {
        return response.fail(res, "You cannot change your own role", 403);
      }

      // Verify the role exists
      const role = await roleService.getRoleById(role_id);
      if (!role) {
        return response.fail(res, "Role not found", 404);
      }

      // Update user role
      const result = await ownerService.updateUserRole(user_id, role_id);

      // Log the action
      await auditService.log({
        user_id: admin_user_id,
        action: "ADMIN_CHANGED_USER_ROLE",
        details: {
          target_user_id: user_id,
          new_role_id: role_id,
          role_name: role.name,
        },
      });

      logger.info(
        `Admin ${admin_user_id} changed role for user ${user_id} to ${role_id}`,
      );

      return response.success(res, "User role updated successfully", 200, {
        user_id,
        role_id,
        role_name: role.name,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Update user role error:", error);
      return response.fail(res, "Failed to update user role", 500);
    }
  }

  /**
   * GET /api/owner/users/:user_id/creator-activity
   * Published labs/courses + enrollment/purchase stats for admin monitoring.
   */
  async getUserCreatorActivity(req, res) {
    try {
      const { user_id: userId } = req.params;
      const data = await learningService.getUserCreatorActivityDetails(userId);
      return response.success(res, "Creator activity retrieved", 200, data);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error("Get user creator activity error:", error);
      return response.fail(res, "Failed to load creator activity", 500);
    }
  }

  async addUser(req, res) {
    try {
      const v = new Validator(req.body, {
        phone: "required|string|minLength:10|maxLength:15",
        full_name: "required|string|minLength:2|maxLength:100",
        email: "required|email",
        password: "required|string|minLength:8|maxLength:36",
        roleId: "required|string",
      });

      const matched = await v.check();
      if (!matched) {
        const firstErrorKey = Object.keys(v.errors)[0];
        return response.fail(res, v.errors[firstErrorKey].message, 400);
      }

      const { email, password, roleId, phone, full_name } = req.body;
      const admin_user_id = req.user.user_id;
      const phoneDigits = String(phone || "").replace(/\D/g, "");

      const newUser = await ownerService.addUser({
        email,
        password,
        role_id: roleId,
        phone: phoneDigits,
        full_name,
        isVerified: true,
        isActive: true,
      });

      await auditService.log({
        user_id: admin_user_id,
        action: "ADMIN_ADDED_USER",
        metadata: {
          new_user_id: newUser.user_id,
          email,
          roleId,
        },
      });

      logger.info(
        `Admin ${admin_user_id} added new user ${newUser.id} with email ${email} and role ${roleId}`,
      );

      return response.success(res, "User added successfully", 201, {
        user_id: newUser.user_id,
        email: newUser.email,
        roleId,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }

      logger.error("Add user error:", error);
      return response.fail(res, "Failed to add user", 500);
    }
  }
}

module.exports = new OwnerController();

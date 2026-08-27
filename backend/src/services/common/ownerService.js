const sessionService = require("../sessionService");
const otpService = require("../otpService");
const totpService = require("../totpService");
const deviceService = require("../deviceService");
const auditService = require("../auditService");
const tokenBlacklistService = require("../tokenBlacklistService");
const ipWhitelistService = require("../ipWhitelistService");
const roleService = require("../rbac/roleService");
const {
  createAccessToken,
  createRefreshToken,
  createSessionId,
  decodeToken,
  blacklistJti,
} = require("../../utils/token");
const { AppError } = require("../../middleware/errorHandler");
const config = require("../../config");
const { User, Role } = require("../../models");
const logger = require("../../lib/logger");
const { v4: uuidv4 } = require("uuid");

/**
 * Owner Service - User Profile & Security Management
 * Handles all user-related operations for authenticated users
 */
class OwnerService {
  constructor() {
    this.userRepository = null;
  }

  async addUser(userData) {
    const service = new OwnerService();
    return await service.createUser(userData);
  }

  static setUserRepository(repository) {
    OwnerService._sharedRepository = repository;
  }

  _getUserRepository() {
    if (!this.userRepository) {
      this.userRepository = OwnerService._sharedRepository;
    }
    return this.userRepository;
  }

  // ==========================================
  // USER CREATION (For Seeding)
  // ==========================================

  async createUser(userData) {
    try {
      const {
        user_id,
        email,
        full_name,
        password,
        role_id: roleIdFromBody,
        roleId,
        phone,
        isVerified = false,
        isActive = true,
        created_by = "system",
      } = userData;

      const role_id = roleIdFromBody || roleId;

      if (!email || !full_name || !password || !role_id) {
        throw new AppError(
          "Missing required fields: email, full_name, password, role_id",
          400,
          "MISSING_FIELDS",
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const normalizedPhone =
        phone != null && String(phone).trim() !== ""
          ? String(phone).replace(/\D/g, "")
          : null;

      const existingUser = await User.findOne({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        throw new AppError(
          `User with email ${email} already exists`,
          400,
          "USER_EXISTS",
        );
      }

      if (normalizedPhone) {
        const existingPhone = await User.findOne({
          where: { phone: normalizedPhone },
        });
        if (existingPhone) {
          throw new AppError(
            "Phone number is already registered to another user",
            400,
            "PHONE_EXISTS",
          );
        }
      }

      const role = await Role.findByPk(role_id);
      if (!role) {
        throw new AppError(
          `Selected role was not found. Please refresh and pick a role again.`,
          404,
          "ROLE_NOT_FOUND",
        );
      }

      const user = await User.create({
        user_id: user_id || uuidv4(),
        email: normalizedEmail,
        full_name: full_name.trim(),
        password_hash: password,
        role_id: role_id,
        phone: normalizedPhone,
        is_verified: isVerified,
        is_active: isActive,
      });

      logger.info(
        `User created: ${email} (${user.user_id}) with role_id: ${role_id}`,
      );
      return this._sanitizeUser(user);
    } catch (error) {
      if (error instanceof AppError) throw error;

      if (error.name === "SequelizeUniqueConstraintError") {
        const field =
          error.errors?.[0]?.path ||
          Object.keys(error.fields || {})[0] ||
          "";
        if (field === "email") {
          throw new AppError("Email is already registered", 400, "EMAIL_EXISTS");
        }
        if (field === "phone") {
          throw new AppError(
            "Phone number is already registered to another user",
            400,
            "PHONE_EXISTS",
          );
        }
        throw new AppError(
          "A user with this email or phone already exists",
          400,
          "DUPLICATE_USER",
        );
      }

      if (error.name === "SequelizeForeignKeyConstraintError") {
        throw new AppError(
          "Invalid role selected. Please refresh and try again.",
          400,
          "INVALID_ROLE",
        );
      }

      logger.error("Error creating user:", error);
      throw new AppError("Failed to create user", 500, "CREATE_USER_ERROR");
    }
  }

  // ==========================================
  // PROFILE MANAGEMENT
  // ==========================================

  async getUserProfile(user_id) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const userInstance = await repository.findByUserId(user_id);
      if (!userInstance) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
      }

      const user =
        typeof userInstance.get === "function"
          ? userInstance.get({ plain: true })
          : (userInstance.toJSON?.() ?? userInstance);

      const mfaStatus = await totpService.getMfaStatus(user_id);
      const permissions = await roleService.getUserPermissions(user_id);

      return {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        role_id: user.role_id,
        profile_image: user.profile_image,
        fcm_token: user.fcm_token,
        role: user.role
          ? {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description,
          }
          : null,
        is_active: user.is_active,
        is_verified: user.is_verified,
        requires_mfa: user.requires_mfa,
        mfa_enabled: mfaStatus.enabled,
        backup_codes_remaining: mfaStatus.backupCodesRemaining,
        permissions,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        last_login_ip: user.last_login_ip,
        city: user.city,
        state: user.state,
        country: user.country,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Get user profile error:", error);
      throw new AppError(
        "Failed to get user profile",
        500,
        "GET_PROFILE_ERROR",
      );
    }
  }

  async getAllUsers(options = {}) {
    try {
      const { page = 1, limit = 10, search, role_id, status } = options;

      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const filters = {};
      if (search) filters.search = search;
      if (role_id) filters.role_id = role_id;
      if (status) filters.status = status;

      const offset = (page - 1) * limit;
      const result = await repository.findAll({
        page,
        ...filters,
        limit,
        offset,
        order: [["created_at", "DESC"]],
      });

      const rawUsers = Array.isArray(result) ? result : result?.rows || [];
      const total = result?.count || rawUsers.length;

      if (rawUsers.length === 0) {
        return {
          users: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      const users = rawUsers.map((u) =>
        typeof u.get === "function"
          ? u.get({ plain: true })
          : (u.toJSON?.() ?? u),
      );

      const SENSITIVE_FIELDS = [
        "password_hash",
        "mfa_secret",
        "mfa_backup_codes",
        "failed_login_attempts",
        "locked_until",
        "password_changed_at",
        "last_mfa_verified_at",
      ];

      const usersWithMfa = await Promise.all(
        users.map(async (user) => {
          const mfaStatus = await totpService.getMfaStatus(user.user_id);
          const safeUser = {
            ...user,
            mfa_enabled: mfaStatus.enabled,
            backup_codes_remaining: mfaStatus.backupCodesRemaining,
          };
          SENSITIVE_FIELDS.forEach((field) => delete safeUser[field]);
          return safeUser;
        }),
      );

      return {
        users: usersWithMfa,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Get all users error:", error);
      throw new AppError("Failed to get all users", 500, "GET_ALL_USERS_ERROR");
    }
  }

  async updateProfile(user_id, user_data) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const dataToUpdate = {};

      if (user_data.full_name) {
        dataToUpdate.full_name = user_data.full_name;
      }

      if (user_data.phone) {
        const phone_exists = await repository.phoneExists(user_data.phone);
        if (phone_exists) {
          const existing_user = await repository.findByPhone(user_data.phone);
          if (existing_user && existing_user.user_id !== user_id) {
            throw new AppError(
              "Phone number already in use",
              400,
              "PHONE_EXISTS",
            );
          }
        }
        dataToUpdate.phone = user_data.phone;
      }
      if (user_data.profile_image) {
        if (Buffer.isBuffer(user_data.profile_image)) {
          const mediaStorage = require("../mediaStorageService");
          dataToUpdate.profile_image = await mediaStorage.saveImage(
            user_data.profile_image,
            "avatar.webp",
            { folder: "profiles", outName: `avatar_${user_id}_${Date.now()}.webp` }
          );
        } else if (typeof user_data.profile_image === "string") {
          dataToUpdate.profile_image = user_data.profile_image;
        }
      }
      if (user_data.city !== undefined) {
        dataToUpdate.city = user_data.city;
      }
      if (user_data.state !== undefined) {
        dataToUpdate.state = user_data.state;
      }
      if (user_data.country !== undefined) {
        dataToUpdate.country = user_data.country;
      }

      const updated_user = await repository.update(user_id, dataToUpdate);

      await auditService.log({
        user_id,
        action: "PROFILE_UPDATED",
        details: { fields: Object.keys(dataToUpdate) },
      });

      logger.info(`Profile updated for user: ${user_id}`);

      return {
        user_id: updated_user.user_id,
        email: updated_user.email,
        phone: updated_user.phone,
        full_name: updated_user.full_name,
        profile_image: updated_user.profile_image,
        city: updated_user.city,
        state: updated_user.state,
        country: updated_user.country,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Update profile error:", error);
      throw new AppError(
        "Failed to update profile",
        500,
        "UPDATE_PROFILE_ERROR",
      );
    }
  }

  async requestEmailUpdate(user_id, new_email, password) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const user = await repository.findByUserId(user_id);
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

      const isValidPassword = await repository.verifyPassword(user, password);
      if (!isValidPassword)
        throw new AppError("Invalid password", 401, "INVALID_PASSWORD");

      const emailExists = await repository.emailExists(new_email);
      if (emailExists)
        throw new AppError("Email already in use", 400, "EMAIL_EXISTS");

      const otp_token = await otpService.generateOtp(new_email, "email_update");

      await auditService.log({
        user_id,
        action: "EMAIL_UPDATE_REQUESTED",
        details: { new_email },
      });
      logger.info(`Email update requested for user: ${user_id}`);

      return {
        success: true,
        message: "Verification code sent to new email",
        otp_token,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Request email update error:", error);
      throw new AppError(
        "Failed to request email update",
        500,
        "EMAIL_UPDATE_REQUEST_ERROR",
      );
    }
  }

  async verifyEmailUpdate(user_id, otp_token, otp) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const verification = await otpService.verifyOtp(otp_token, otp);
      if (!verification.valid)
        throw new AppError(
          "Invalid or expired verification code",
          400,
          "INVALID_OTP",
        );

      const new_email = verification.identifier;
      await repository.update(user_id, { email: new_email, is_verified: true });

      await auditService.log({
        user_id,
        action: "EMAIL_UPDATED",
        details: { new_email },
      });
      logger.info(`Email updated for user: ${user_id}`);

      return { success: true, message: "Email updated successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Verify email update error:", error);
      throw new AppError("Failed to update email", 500, "EMAIL_UPDATE_ERROR");
    }
  }

  async deleteAccount(user_id, password) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const user = await repository.findByUserId(user_id);
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

      const isValidPassword = await repository.verifyPassword(user, password);
      if (!isValidPassword)
        throw new AppError("Invalid password", 401, "INVALID_PASSWORD");

      await sessionService.deleteAllUserSessions(user_id);
      await tokenBlacklistService.blacklistUserTokens(user_id);
      await totpService.disableMfa(user_id);

      const devices = await deviceService.getTrustedDevices(user_id);
      for (const device of devices) {
        await deviceService.removeTrustedDevice(user_id, device.device_id);
      }

      await repository.delete(user_id);

      await auditService.log({
        user_id,
        action: "ACCOUNT_DELETED",
        success: true,
      });
      logger.info(`Account deleted for user: ${user_id}`);

      return { success: true, message: "Account deleted successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Delete account error:", error);
      throw new AppError(
        "Failed to delete account",
        500,
        "DELETE_ACCOUNT_ERROR",
      );
    }
  }

  async deleteUserById(user_id) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const user = await repository.findByUserId(user_id);
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

      await sessionService.deleteAllUserSessions(user_id);
      await tokenBlacklistService.blacklistUserTokens(user_id);
      await repository.delete(user_id);

      await auditService.log({
        user_id,
        action: "ADMIN_DELETED_USER",
        success: true,
      });
      logger.info(`User deleted by admin: ${user_id}`);

      return { success: true, message: "User deleted successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Delete user error:", error);
      throw new AppError(
        "Failed to delete user",
        500,
        "DELETE_USER_ERROR",
      );
    }
  }

  async bulkDeleteUsers(user_ids) {
    try {
      for (const userId of user_ids) {
        await this.deleteUserById(userId);
      }
      return {
        success: true,
        message: `${user_ids.length} user(s) deleted successfully`,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Bulk delete users error:", error);
      throw new AppError(
        "Failed to bulk delete users",
        500,
        "BULK_DELETE_USERS_ERROR",
      );
    }
  }

  // ==========================================
  // PASSWORD MANAGEMENT
  // ==========================================

  async changePassword(user_id, old_password, new_password) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const user = await repository.findByUserId(user_id);
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

      const isValidPassword = await repository.verifyPassword(
        user,
        old_password,
      );
      if (!isValidPassword)
        throw new AppError(
          "Current password is incorrect",
          401,
          "INVALID_PASSWORD",
        );

      if (new_password.length < 8)
        throw new AppError(
          "Password must be at least 8 characters",
          400,
          "WEAK_PASSWORD",
        );

      await repository.updatePassword(user_id, new_password);

      await auditService.log({ user_id, action: "PASSWORD_CHANGED" });
      logger.info(`Password changed for user: ${user_id}`);

      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Change password error:", error);
      throw new AppError(
        "Failed to change password",
        500,
        "CHANGE_PASSWORD_ERROR",
      );
    }
  }

  // ==========================================
  // MFA MANAGEMENT
  // ==========================================

  async enableMfaStart(user_id) {
    try {
      const mfa_status = await totpService.getMfaStatus(user_id);
      if (mfa_status.enabled)
        throw new AppError(
          "MFA is already enabled",
          400,
          "MFA_ALREADY_ENABLED",
        );

      const mfa_data = await totpService.generateSecret(user_id);

      await auditService.log({ user_id, action: "MFA_SETUP_INITIATED" });
      logger.info(`MFA setup initiated for user: ${user_id}`);

      return {
        success: true,
        secret: mfa_data.secret,
        qr_code: mfa_data.qr_code,
        backup_codes: mfa_data.backup_codes,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Enable MFA start error:", error);
      throw new AppError("Failed to initiate MFA setup", 500, "MFA_SETUP_ERROR");
    }
  }

  async enableMfaVerify(user_id, code) {
    try {
      const verified = await totpService.verifySetup(user_id, code);
      if (!verified)
        throw new AppError("Invalid verification code", 400, "INVALID_CODE");

      await totpService.activateMfa(user_id);

      const mfa_status = await totpService.getMfaStatus(user_id);

      await auditService.log({ user_id, action: "MFA_ENABLED" });
      logger.info(`MFA enabled for user: ${user_id}`);

      return {
        success: true,
        message: "MFA enabled successfully",
        backup_codes: mfa_status.backup_codes_remaining,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Enable MFA verify error:", error);
      throw new AppError("Failed to enable MFA", 500, "MFA_ENABLE_ERROR");
    }
  }

  async disableMfa(user_id, password, code) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const user = await repository.findByUserId(user_id);
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

      const isValidPassword = await repository.verifyPassword(user, password);
      if (!isValidPassword)
        throw new AppError("Invalid password", 401, "INVALID_PASSWORD");

      const verified = await totpService.verifyUserCode(user_id, code);
      if (!verified)
        throw new AppError("Invalid MFA code", 400, "INVALID_MFA_CODE");

      await totpService.disableMfa(user_id);

      await auditService.log({ user_id, action: "MFA_DISABLED" });
      logger.info(`MFA disabled for user: ${user_id}`);

      return { success: true, message: "MFA disabled successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Disable MFA error:", error);
      throw new AppError("Failed to disable MFA", 500, "MFA_DISABLE_ERROR");
    }
  }

  async regenerateBackupCodes(user_id) {
    try {
      const backup_codes = await totpService.regenerateBackupCodes(user_id);

      await auditService.log({ user_id, action: "MFA_BACKUP_CODES_REGENERATED" });
      logger.info(`MFA backup codes regenerated for user: ${user_id}`);

      return {
        success: true,
        message: "Backup codes regenerated successfully",
        backup_codes,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Regenerate backup codes error:", error);
      throw new AppError(
        "Failed to regenerate backup codes",
        500,
        "BACKUP_CODES_ERROR",
      );
    }
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  /**
   * Get user sessions for display
   * ✅ FIX: getUserSessions now returns full objects — strip accessToken before
   * sending to client (never expose raw JWT to frontend)
   */
  async getUserSessions(user_id, current_session_id) {
    try {
      const sessions = await sessionService.getUserSessions(user_id);

      return sessions
        .map((session) => {
          if (!session) return null;
          const sid = session.session_id ?? session.sessionId;
          return {
            session_id: sid,
            is_current: sid === current_session_id,
            created_at: session.createdAt,
            last_activity: session.updatedAt || session.createdAt,
            ip_address: session.ipAddress,
            user_agent: session.userAgent,
            device_info: session.deviceInfo,
            is_trusted: session.isTrusted,
            // ✅ accessToken intentionally excluded from response
          };
        })
        .filter(Boolean);
    } catch (error) {
      logger.error("Get user sessions error:", error);
      throw new AppError("Failed to get sessions", 500, "GET_SESSIONS_ERROR");
    }
  }

  async deleteSession(user_id, session_id) {
    try {
      const session = await sessionService.getSession(session_id);
      if (!session || session.user_id !== user_id) {
        throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
      }

      await sessionService.deleteSession(session_id);
      await auditService.log({
        user_id,
        action: "SESSION_DELETED",
        details: { session_id },
      });
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Delete session error:", error);
      throw new AppError(
        "Failed to delete session",
        500,
        "DELETE_SESSION_ERROR",
      );
    }
  }

  async logout(session_id, user_id, access_token) {
    try {
      await sessionService.deleteSession(session_id);
      // 2. Blacklist the access token by jti
      if (access_token) {
        const decoded = await decodeToken(access_token);

        if (decoded?.jti && decoded?.exp) {
          await blacklistJti({
            jti: decoded.jti,
            user_id: user_id,
            exp: decoded.exp,
            reason: "user_logout",
            ipAddress: null,
            userAgent: null,
          });
        } else {
          logger.warn("[logout] Token has no jti/exp — skipping blacklist");
        }
      }
      await auditService.log({
        user_id,
        action: "LOGOUT",
        details: { session_id },
      });
      logger.info(`User logged out: ${user_id}`);
      return { success: true };
    } catch (error) {
      logger.error("Logout error:", error);
      throw new AppError("Logout failed", 500, "LOGOUT_ERROR");
    }
  }

  async logoutAll(user_id) {
    try {
      const deletedCount = await sessionService.deleteAllUserSessions(user_id);
      await auditService.log({
        user_id,
        action: "LOGOUT_ALL_DEVICES",
        details: { sessions_terminated: deletedCount },
      });
      logger.info(`User logged out from all devices: ${user_id}`);
      return { success: true, sessions_terminated: deletedCount };
    } catch (error) {
      logger.error("Logout all error:", error);
      throw new AppError(
        "Failed to logout from all devices",
        500,
        "LOGOUT_ALL_ERROR",
      );
    }
  }

  async refreshToken(session_id) {
    try {
      const session = await sessionService.getSession(session_id);
      if (!session)
        throw new AppError("Invalid session", 401, "INVALID_SESSION");

      const isUserBlacklisted = await tokenBlacklistService.isUserBlacklisted(
        session.user_id,
      );
      if (isUserBlacklisted) {
        await sessionService.deleteSession(session_id);
        throw new AppError(
          "All tokens have been revoked",
          401,
          "TOKENS_REVOKED",
        );
      }

      const new_refresh_token = createRefreshToken();
      const new_access_token = await createAccessToken(session.user_id);

      // ✅ Pass newAccessToken so it gets stored in cache for future blacklisting
      await sessionService.updateSession(session_id, new_refresh_token, {
        newAccessToken: new_access_token,
      });

      let permissions = [];
      try {
        permissions = await roleService.getUserPermissions(session.user_id);
      } catch (permError) {
        logger.warn(
          `Could not fetch permissions during token refresh for user ${session.user_id}:`,
          permError.message,
        );
      }

      return {
        access_token: new_access_token,
        expires_in: 300,
        session_id,
        permissions,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Token refresh error:", error);
      throw new AppError("Token refresh failed", 500, "REFRESH_ERROR");
    }
  }

  // ==========================================
  // SECURITY FEATURES
  // ==========================================

  async getTrustedDevices(user_id) {
    try {
      const devices = await deviceService.getTrustedDevices(user_id);
      return { devices, total: devices.length };
    } catch (error) {
      logger.error("Get trusted devices error:", error);
      throw new AppError(
        "Failed to get trusted devices",
        500,
        "GET_DEVICES_ERROR",
      );
    }
  }

  async removeTrustedDevice(user_id, device_id) {
    try {
      await deviceService.removeTrustedDevice(user_id, device_id);
      await auditService.log({
        user_id,
        action: "TRUSTED_DEVICE_REMOVED",
        details: { device_id },
      });
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Remove trusted device error:", error);
      throw new AppError(
        "Failed to remove trusted device",
        500,
        "REMOVE_DEVICE_ERROR",
      );
    }
  }

  async getSecurityOverview(user_id) {
    try {
      const [
        active_sessions,
        trusted_devices,
        mfa_status,
        ip_whitelist,
        recent_logins,
      ] = await Promise.all([
        sessionService.getUserSessionCount(user_id),
        deviceService.getTrustedDevices(user_id),
        totpService.getMfaStatus(user_id),
        ipWhitelistService.getWhitelist(user_id),
        auditService.getRecentLogins(user_id, 5),
      ]);

      return {
        active_sessions,
        trusted_devices: trusted_devices.length,
        mfa_enabled: mfa_status.enabled,
        ip_whitelist_enabled: ip_whitelist.enabled,
        whitelisted_ips: ip_whitelist.ips.length,
        recent_logins,
      };
    } catch (error) {
      logger.error("Get security overview error:", error);
      throw new AppError(
        "Failed to get security overview",
        500,
        "SECURITY_OVERVIEW_ERROR",
      );
    }
  }

  async getAuditLogs(user_id, options = {}) {
    try {
      const { page = 1, limit = 50, action } = options;
      return await auditService.getUserLogs(user_id, {
        page: parseInt(page),
        limit: parseInt(limit),
        action,
      });
    } catch (error) {
      logger.error("Get audit logs error:", error);
      throw new AppError("Failed to get audit logs", 500, "AUDIT_LOGS_ERROR");
    }
  }

  // ==========================================
  // IP WHITELIST MANAGEMENT
  // ==========================================

  async getIpWhitelist(user_id) {
    try {
      const whitelist = await ipWhitelistService.getWhitelist(user_id);
      return {
        enabled: whitelist.enabled,
        ips: whitelist.ips,
        total: whitelist.ips.length,
      };
    } catch (error) {
      logger.error("Get IP whitelist error:", error);
      throw new AppError(
        "Failed to get IP whitelist",
        500,
        "GET_WHITELIST_ERROR",
      );
    }
  }

  async addIpToWhitelist(user_id, ip, description) {
    try {
      await ipWhitelistService.addIp(user_id, ip, description);
      await auditService.log({
        user_id,
        action: "IP_ADDED_TO_WHITELIST",
        details: { ip, description },
      });
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Add IP to whitelist error:", error);
      throw new AppError("Failed to add IP to whitelist", 500, "ADD_IP_ERROR");
    }
  }

  async removeIpFromWhitelist(user_id, ip) {
    try {
      await ipWhitelistService.removeIp(user_id, ip);
      await auditService.log({
        user_id,
        action: "IP_REMOVED_FROM_WHITELIST",
        details: { ip },
      });
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Remove IP from whitelist error:", error);
      throw new AppError(
        "Failed to remove IP from whitelist",
        500,
        "REMOVE_IP_ERROR",
      );
    }
  }

  async toggleIpWhitelist(user_id, enabled) {
    try {
      await ipWhitelistService.setEnabled(user_id, enabled);
      await auditService.log({
        user_id,
        action: enabled ? "IP_WHITELIST_ENABLED" : "IP_WHITELIST_DISABLED",
      });
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Toggle IP whitelist error:", error);
      throw new AppError(
        "Failed to toggle IP whitelist",
        500,
        "TOGGLE_WHITELIST_ERROR",
      );
    }
  }

  // ==========================================
  // ROLE MANAGEMENT
  // ==========================================

  async updateUserRole(user_id, role_id) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      await repository.updateRole(user_id, role_id);
      await roleService.clearUserCache(user_id);

      await auditService.log({
        user_id,
        action: "ROLE_UPDATED",
        details: { role_id },
      });
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Update user role error:", error);
      throw new AppError(
        "Failed to update user role",
        500,
        "UPDATE_ROLE_ERROR",
      );
    }
  }

  async updateUserById(user_id, payload = {}) {
    try {
      const repository = this._getUserRepository();
      if (!repository) {
        throw new AppError(
          "User repository not configured",
          500,
          "REPOSITORY_ERROR",
        );
      }

      const user = await repository.findByUserId(user_id);
      if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
      }

      const patch = {};
      if (payload.full_name !== undefined) patch.full_name = String(payload.full_name || "").trim();
      if (payload.phone !== undefined) patch.phone = payload.phone;
      if (payload.is_active !== undefined) patch.is_active = !!payload.is_active;

      if (Object.keys(patch).length === 0) {
        throw new AppError("No fields provided for update", 400, "NO_UPDATE_FIELDS");
      }

      const updated = await repository.update(user_id, patch);
      await auditService.log({
        user_id,
        action: "USER_UPDATED_BY_ADMIN",
        details: { fields: Object.keys(patch) },
      });
      return this._sanitizeUser(updated);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Update user by id error:", error);
      throw new AppError("Failed to update user", 500, "UPDATE_USER_ERROR");
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  _sanitizeUser(user) {
    const userData = user.toJSON ? user.toJSON() : user;
    delete userData.password_hash;
    return userData;
  }

  /**
   * Create auth session and store accessToken in Redis for JTI blacklisting.
   *
   * ✅ FIX: accessToken is now passed as the 3rd argument to createSession()
   * so the session cache entry includes it. _blacklistUserTokens in roleService
   * can then decode the JTI and blacklist it when permissions change.
   */
  async _createAuthSession(params) {
    const {
      userId,
      ipAddress,
      userAgent,
      deviceInfo,
      deviceFingerprint,
      isTrustedDevice = false,
      mfaVerified = false,
      deviceVerified = false,
      rememberMe = false,
    } = params;

    const sessionId = createSessionId();
    const refreshToken = createRefreshToken();
    const accessToken = createAccessToken(userId);

    const sessionTtl = rememberMe
      ? config.session.extendedTtl
      : config.session.ttl;

    const metadata = {
      userAgent,
      ipAddress,
      deviceInfo,
      deviceFingerprint,
      isTrusted: isTrustedDevice,
      mfaVerified,
      deviceVerified,
      rememberMe,
    };

    // ✅ FIX: pass accessToken as 3rd arg (matches the fixed createSession signature)
    await sessionService.createSession(
      sessionId,
      userId,
      accessToken,
      refreshToken,
      metadata,
      sessionTtl,
    );

    return {
      sessionId,
      accessToken,
      tokenType: "Bearer",
      expiresIn: 300,
      sessionTtl,
    };
  }
}

// Initialize with user repository
const UserRepository = require("../../repositories/userRepository");
const userRepo = new UserRepository();
OwnerService.setUserRepository(userRepo);

module.exports = new OwnerService();

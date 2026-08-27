const sessionService = require('../services/sessionService');
const logger = require('../lib/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * @summary Force a user to log out
 * @description Terminates all active sessions for a specific user. This is an administrative action.
 * @route POST /api/admin/users/:user_id/logout
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {Promise<void>}
 */
async function adminForceLogout(req, res) {
  try {
    const { user_id } = req.params;
    const { reason } = req.body;

    if (!user_id) {
      throw new AppError('User ID is required', 400, 'MISSING_USER_ID');
    }

    const deletedCount = await sessionService.deleteAllUserSessions(user_id);

    logger.warn(`Admin force logout: User ${user_id} (${deletedCount} sessions). Reason: ${reason || 'Not provided'}`);

    res.status(200).json({
      success: true,
      message: `User ${user_id} logged out from all devices`,
      data: {
        user_id,
        sessions_terminated: deletedCount,
        reason: reason || null,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Admin force logout error:', error);
    throw new AppError('Failed to force logout user', 500, 'ADMIN_LOGOUT_FAILED');
  }
}

/**
 * @summary Terminate a specific session
 * @description Terminates a single active session.
 * @route DELETE /api/admin/sessions/:session_id
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {Promise<void>}
 */
async function adminTerminateSession(req, res) {
  try {
    const { session_id } = req.params;
    const { reason } = req.body;

    if (!session_id) {
      throw new AppError('Session ID is required', 400, 'MISSING_SESSION_ID');
    }

    const session = await sessionService.getSession(session_id);

    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    await sessionService.deleteSession(session_id);

    logger.warn(`Admin terminated session ${session_id} for user ${session.user_id}. Reason: ${reason || 'Not provided'}`);

    res.status(200).json({
      success: true,
      message: 'Session terminated successfully',
      data: {
        session_id,
        user_id: session.user_id,
        reason: reason || null,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Admin terminate session error:', error);
    throw new AppError('Failed to terminate session', 500, 'ADMIN_TERMINATE_FAILED');
  }
}

/**
 * @summary Get all active sessions for a user
 * @description Retrieves all active sessions for a specific user.
 * @route GET /api/admin/users/:user_id/sessions
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {Promise<void>}
 */
async function adminGetUserSessions(req, res) {
  try {
    const { user_id } = req.params;

    const session_ids = await sessionService.getUserSessions(user_id);

    const sessions = await Promise.all(
      session_ids.map(async (sid) => {
        const session = await sessionService.getSession(sid);
        return {
          session_id: sid,
          user_id: session?.user_id,
          created_at: session?.createdAt,
          updated_at: session?.updatedAt,
          user_agent: session?.userAgent,
          ip_address: session?.ipAddress,
          device_info: session?.deviceInfo,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        user_id,
        sessions: sessions.filter(s => s !== null),
        total: sessions.length,
      },
    });
  } catch (error) {
    logger.error('Admin get user sessions error:', error);
    throw new AppError('Failed to retrieve user sessions', 500, 'ADMIN_GET_SESSIONS_FAILED');
  }
}

/**
 * @summary Get system-wide session statistics
 * @description Retrieves statistics about all active sessions.
 * @route GET /api/admin/stats/sessions
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {Promise<void>}
 */
async function getSessionStats(req, res) {
  try {
    const redisManager = require('../lib/redisManager');
    const redis =await redisManager.getClientSafe();

    // Get all session keys
    const session_keys = await redis.keys('session:*');
    const user_session_keys = await redis.keys('user_sessions:*');

    // Sample some sessions for details
    const sample_size = Math.min(10, session_keys.length);
    const sample_keys = session_keys.slice(0, sample_size);

    const samples = await Promise.all(
      sample_keys.map(async (key) => {
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        return {
          key,
          data: data ? JSON.parse(data) : null,
          ttl,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        total_sessions: session_keys.length,
        total_users: user_session_keys.length,
        samples: samples.filter(s => s.data !== null),
      },
    });
  } catch (error) {
    logger.error('Get session stats error:', error);
    throw new AppError('Failed to retrieve session statistics', 500, 'STATS_FAILED');
  }
}

module.exports = {
  adminForceLogout,
  adminTerminateSession,
  adminGetUserSessions,
  getSessionStats,
};

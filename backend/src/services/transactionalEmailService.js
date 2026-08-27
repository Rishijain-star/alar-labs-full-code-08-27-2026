const emailService = require("./emailService");
const systemSettingsService = require("./systemSettingsService");
const notificationService = require("./notificationService");
const logger = require("../lib/logger");

/**
 * Sends transactional emails + admin/user notifications based on system notification prefs.
 */
class TransactionalEmailService {
  async getPrefs() {
    try {
      return await systemSettingsService.getNotificationPrefs();
    } catch (_) {
      return {
        emailNotifications: true,
        newUserNotify: true,
        purchaseNotify: true,
        completionNotify: false,
        enrollmentEmailUser: true,
        enrollmentEmailAdmin: true,
        enrollmentPushUser: true,
      };
    }
  }

  async sendEnrollmentEmails({ user, itemTitle, itemType, isFree, isPurchase = false }) {
    const prefs = await this.getPrefs();
    if (!prefs.emailNotifications) return;

    const appName = process.env.EMAIL_FROM_NAME || "ALAR Labs";
    const userName = user?.full_name || user?.email || "Learner";
    const userEmail = user?.email;

    if (prefs.enrollmentEmailUser !== false && userEmail) {
      try {
        const action = isPurchase ? "purchased" : isFree ? "enrolled in" : "enrolled in";
        await emailService.sendCustom(
          userEmail,
          `${itemType} enrollment confirmation`,
          "enrollment.html",
          {
            TITLE: `You're enrolled!`,
            USER_NAME: userName,
            MESSAGE: `You have successfully ${action} <strong>${itemTitle}</strong>. Open the platform to start learning.`,
            APP_NAME: appName,
          }
        );
      } catch (e) {
        logger.warn(`[TransactionalEmail] User enrollment email failed: ${e.message}`);
      }
    }

    if (prefs.enrollmentPushUser !== false && user?.user_id) {
      try {
        await notificationService.createNotification({
          userId: user.user_id,
          audience: "user",
          eventType: isPurchase ? "course_purchase" : "enrollment",
          title: isPurchase ? "Purchase successful" : "Enrollment successful",
          message: `You are enrolled in ${itemTitle}.`,
          metadata: { itemType, isFree, isPurchase },
        });
      } catch (_) { /* push handled inside createNotification */ }
    }

    if (prefs.purchaseNotify !== false && (isPurchase || !isFree) && prefs.enrollmentEmailAdmin !== false) {
      try {
        await notificationService.createNotification({
          audience: "admin",
          eventType: isPurchase ? "purchase" : "enrollment",
          title: isPurchase ? "New purchase" : "New enrollment",
          message: `${userName} ${isPurchase ? "purchased" : "enrolled in"} ${itemType}: ${itemTitle}.`,
          metadata: { userId: user?.user_id, itemType, isFree },
        });
      } catch (_) { }
    }
  }

  async sendRegistrationEmails({ user }) {
    const prefs = await this.getPrefs();
    if (!prefs.emailNotifications) return;

    if (prefs.newUserNotify !== false) {
      try {
        await notificationService.createNotification({
          audience: "admin",
          eventType: "user_registration",
          title: "New user registered",
          message: `${user?.full_name || user?.email || "A user"} completed registration.`,
          metadata: { userId: user?.user_id },
        });
      } catch (_) { }
    }

    if (user?.email) {
      try {
        const appName = process.env.EMAIL_FROM_NAME || "ALAR Labs";
        await emailService.sendCustom(
          user.email,
          "Welcome to ALAR Labs",
          "enrollment.html",
          {
            TITLE: "Welcome!",
            USER_NAME: user.full_name || "there",
            MESSAGE: "Your account is verified. Browse courses and labs to start learning.",
            APP_NAME: appName,
          }
        );
      } catch (e) {
        logger.warn(`[TransactionalEmail] Welcome email failed: ${e.message}`);
      }
    }
  }
}

module.exports = new TransactionalEmailService();

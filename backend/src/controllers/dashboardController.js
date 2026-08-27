const response = require("../utils/response");
const { fail } = require("../helper/helper");
const dashboardService = require("../services/dashboardService");
const rbacService = require("../services/rbac/roleService");

class DashboardController {
  getStats = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) return response.fail(res, "Authentication required", 401);

      const permissions = await rbacService.getUserPermissions(userId);
      const data = await dashboardService.getStatsForUser(userId, permissions);
      return response.success(res, "Dashboard stats", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new DashboardController();

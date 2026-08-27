const favoriteService = require("../services/favoriteService");
const { AppError } = require("../middleware/errorHandler");

function sendSuccess(res, data, message = "OK", status = 200) {
  return res.status(status).json({ success: true, status, message, data });
}

exports.list = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) throw new AppError("Authentication required", 401);

    const { tab, page, limit } = req.query;
    const result = await favoriteService.listFavorites(userId, { tab, page, limit });
    return sendSuccess(res, result, "Favorites retrieved");
  } catch (err) {
    next(err);
  }
};

exports.status = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) throw new AppError("Authentication required", 401);
    const result = await favoriteService.getStatus(userId);
    return sendSuccess(res, result, "Favorite status retrieved");
  } catch (err) {
    next(err);
  }
};

exports.add = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) throw new AppError("Authentication required", 401);

    const { item_type: itemType, target_id: targetId } = req.body || {};
    if (!itemType || !targetId) throw new AppError("item_type and target_id are required", 400);

    const result = await favoriteService.addFavorite(userId, itemType, targetId);
    return sendSuccess(res, result, result.created ? "Added to favorites" : "Already in favorites", 201);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) throw new AppError("Authentication required", 401);

    const itemType = req.body?.item_type || req.query?.item_type;
    const targetId = req.body?.target_id || req.query?.target_id;
    if (!itemType || !targetId) throw new AppError("item_type and target_id are required", 400);

    await favoriteService.removeFavorite(userId, itemType, targetId);
    return sendSuccess(res, { removed: true }, "Removed from favorites");
  } catch (err) {
    next(err);
  }
};

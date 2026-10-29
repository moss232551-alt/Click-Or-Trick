const profileService = require('../services/profileService');

const getLevels = async (req, res, next) => {
  try {
    const levels = await profileService.getLevelProgress(req.user.id);
    res.json({ items: levels });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLevels,
};

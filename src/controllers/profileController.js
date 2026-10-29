const { z } = require('zod');
const profileService = require('../services/profileService');

const progressSchema = z
  .object({
    levelId: z.string().min(3),
    verdict: z.enum(['correct', 'partial', 'incorrect']),
    scoreDelta: z.number().optional(),
  })
  .strict();

const getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getFullProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const recordProgress = async (req, res, next) => {
  try {
    const payload = progressSchema.parse(req.body || {});
    await profileService.applyMissionResult({
      userId: req.user.id,
      levelId: payload.levelId,
      verdict: payload.verdict,
      scoreDelta: payload.scoreDelta,
    });
    const profile = await profileService.getFullProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const getScoreboard = async (_req, res, next) => {
  try {
    const scoreboard = await profileService.getScoreboard(20);
    res.json({ items: scoreboard });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  recordProgress,
  getScoreboard,
};

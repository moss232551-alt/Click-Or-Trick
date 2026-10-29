const { z } = require('zod');
const { generateChallenge, listStaticChallenges } = require('../services/challengeGenerator');
const storageService = require('../services/storageService');
const profileService = require('../services/profileService');
const { evaluateAnswer } = require('../services/answerEvaluator');
const { options } = require('../utils/paramRandomizer');
const missionPlanner = require('../services/missionPlanner');
const { findLevel } = require('../data/levels');
const { sanitizeChallengeForClient } = require('../utils/challengeSanitizer');

const challengeRequestSchema = z
  .object({
    type: z.enum(options.type).optional(),
    difficulty: z.enum(options.difficulty).optional(),
    target: z.enum(options.target).optional(),
    tactic: z.enum(options.tactic).optional(),
    levelId: z.string().trim().min(1).optional(),
    playerLevel: z.coerce.number().int().min(1).max(9999).optional(),
    playerKey: z.string().trim().min(1).max(120).optional(),
    playerId: z.string().trim().min(1).max(120).optional(),
  })
  .passthrough();

const resultSchema = z
  .object({
    challengeId: z.string(),
    playerId: z.string().optional(),
    playerAnswer: z.enum(['safe', 'suspicious', 'malicious']),
    playerExplanation: z.string().trim().min(5).max(1000),
    correctAnswer: z.enum(['safe', 'suspicious', 'malicious']).optional(),
    responseTimeMs: z.number().int().nonnegative().optional(),
    scoreDelta: z.number().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const recentResultsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).optional(),
  })
  .strict();

const revealClueSchema = z
  .object({
    levelId: z.string().min(1),
    challengeId: z.string().min(1),
    clueIndex: z.coerce.number().int().min(0),
  })
  .strict();

const getChallenge = async (req, res, next) => {
  try {
    const rawInput = req.body && Object.keys(req.body).length ? req.body : req.query || {};
    const overrides = challengeRequestSchema.parse(rawInput);
    let challenge;
    if (overrides.levelId) {
      const playerKey =
        overrides.playerKey || overrides.playerId || (req.user ? `user-${req.user.id}` : null);
      const { levelId, playerLevel, playerKey: bodyKey, playerId: deprecatedKey, ...challengeOverrides } = overrides;
      challenge = await missionPlanner.getMissionForLevel({
        levelId,
        playerLevel: playerLevel || 1,
        playerKey,
        overrides: challengeOverrides,
      });
    } else {
      challenge = await generateChallenge(overrides);
    }
    res.json(sanitizeChallengeForClient(challenge));
  } catch (error) {
    next(error);
  }
};

const getSamples = (_req, res) => {
  res.json({
    count: listStaticChallenges().length,
    items: listStaticChallenges().map((challenge) => sanitizeChallengeForClient(challenge)),
  });
};

const recordResult = async (req, res, next) => {
  try {
    const payload = resultSchema.parse(req.body || {});
    const challenge = await storageService.fetchChallengeById(payload.challengeId);
    if (challenge?.answer && !payload.correctAnswer) {
      payload.correctAnswer = challenge.answer;
    }

    const resultRecord = await storageService.recordResult(payload);

    let feedback = null;
    if (challenge) {
      feedback = await evaluateAnswer({
        challenge,
        playerAnswer: payload.playerAnswer,
        playerExplanation: payload.playerExplanation,
      });
      await storageService.attachFeedbackToResult(resultRecord.id, feedback);
    }

    if (payload.playerId) {
      const userId = Number.parseInt(payload.playerId, 10);
      if (Number.isFinite(userId)) {
        const canonicalCorrectAnswer = payload.correctAnswer || challenge?.answer || null;
        const passed =
          feedback?.verdict === 'correct' ||
          (canonicalCorrectAnswer && payload.playerAnswer === canonicalCorrectAnswer);
        await profileService.applyMissionResult({
          userId,
          levelId: payload.metadata?.levelId,
          verdict: feedback?.verdict || 'partial',
          scoreDelta: payload.scoreDelta,
          passed,
        });
      }
    }

    res.status(201).json({
      status: resultRecord.stored ? 'stored' : 'queued',
      feedback,
      correctAnswer: challenge?.answer || payload.correctAnswer || null,
    });
  } catch (error) {
    next(error);
  }
};

const healthCheck = (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
};

const getRecentResults = async (req, res, next) => {
  try {
    const { limit = 5 } = recentResultsQuerySchema.parse(req.query || {});
    const items = await storageService.listRecentResults(limit);
    const sanitizedItems = items.map((item) => {
      const { correctAnswer, aiFeedback, ...rest } = item;
      const safeFeedback = aiFeedback
        ? {
            verdict: aiFeedback.verdict,
            playerAnswer: aiFeedback.playerAnswer,
            explanation: aiFeedback.explanation,
            playerFeedback: aiFeedback.playerFeedback,
            source: aiFeedback.source,
          }
        : null;
      return { ...rest, aiFeedback: safeFeedback };
    });
    res.json({ count: sanitizedItems.length, items: sanitizedItems });
  } catch (error) {
    next(error);
  }
};

const handleClueReveal = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const payload = revealClueSchema.parse(
      req.body && Object.keys(req.body).length ? req.body : req.query || {},
    );
    const level = findLevel(payload.levelId);
    if (!level) {
      return res.status(404).json({ error: 'Level not found.' });
    }
    const multiplier = level.difficulty === 'hard' ? 0.25 : level.difficulty === 'medium' ? 0.18 : 0.12;
    const cost = Math.ceil((level.scoreReward || 100) * multiplier);
    const challenge = await storageService.fetchChallengeById(payload.challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }
    const clues = Array.isArray(challenge.clues) ? challenge.clues : [];
    const clue = clues[payload.clueIndex];
    if (!clue) {
      return res.status(404).json({ error: 'Clue not available for this challenge.' });
    }
    const profile = await profileService.getProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    if ((profile.score || 0) < cost) {
      return res.status(400).json({ error: 'Not enough points to reveal this clue.' });
    }
    await profileService.adjustScore({ userId: req.user.id, deltaScore: -cost });
    res.json({ status: 'ok', cost, clue, clueIndex: payload.clueIndex });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChallenge,
  getSamples,
  recordResult,
  healthCheck,
  getRecentResults,
  handleClueReveal,
};

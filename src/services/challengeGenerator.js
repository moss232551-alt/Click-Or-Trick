const { nanoid } = require('nanoid');
const staticChallenges = require('../data/staticChallenges');
const { buildChallengeParams } = require('../utils/paramRandomizer');
const { requestChallengeFromAI } = require('./aiClient');
const storageService = require('./storageService');

const pickAnswerGoal = () => {
  const roll = Math.random();
  if (roll < 0.4) return 'safe';
  if (roll < 0.75) return 'suspicious';
  return 'malicious';
};

const normalizeChallenge = (params, payload) => ({
  id: payload.id || nanoid(12),
  type: payload.type || params.type,
  difficulty: payload.difficulty || params.difficulty,
  target: params.target,
  tactic: params.tactic,
  from: payload.from || 'unknown@sender',
  subject: payload.subject || 'Security notification',
  body: payload.body || 'Review the details and mark if this is malicious.',
  attachments: payload.attachments || [],
  clues: payload.clues || [],
  answer: payload.answer || params.answerGoal || 'suspicious',
  explanation: payload.explanation || 'Investigate each clue before responding.',
  levelId: params.levelId || payload.levelId,
});

const buildFallbackChallenge = (params) => {
  const sample = staticChallenges[Math.floor(Math.random() * staticChallenges.length)];
  return {
    ...normalizeChallenge(params, sample),
    source: 'fallback',
  };
};

const generateChallenge = async (overrides = {}) => {
  const params = {
    ...buildChallengeParams(overrides),
    answerGoal: overrides.answerGoal || pickAnswerGoal(),
    levelId: overrides.levelId,
  };
  try {
    const aiChallenge = await requestChallengeFromAI(params);
    const normalized = {
      ...normalizeChallenge(params, aiChallenge),
      source: 'ai',
    };
    storageService.persistChallenge(normalized).catch((err) => {
      console.error('Failed to persist AI challenge', err);
    });
    return normalized;
  } catch (error) {
    const fallback = buildFallbackChallenge(params);
    storageService.persistChallenge(fallback).catch((err) => {
      console.error('Failed to persist fallback challenge', err);
    });
    return fallback;
  }
};

const listStaticChallenges = () => staticChallenges;

module.exports = {
  generateChallenge,
  listStaticChallenges,
};

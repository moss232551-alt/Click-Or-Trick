const { findLevel } = require('../data/levels');
const { generateChallenge } = require('./challengeGenerator');
const storageService = require('./storageService');

const difficultyOrder = ['easy', 'medium', 'hard'];

const clampDifficulty = (difficulty) => {
  if (!difficultyOrder.includes(difficulty)) return 'medium';
  return difficulty;
};

const scaleDifficultyForPlayer = (baseDifficulty, playerLevel = 1) => {
  const baseIndex = difficultyOrder.indexOf(clampDifficulty(baseDifficulty));
  let offset = 0;
  if (playerLevel >= 25) offset = 2;
  else if (playerLevel >= 12) offset = 1;
  const targetIndex = Math.min(difficultyOrder.length - 1, baseIndex + offset);
  return difficultyOrder[targetIndex];
};

const getExistingChallenge = async ({ levelId, difficulty, excludeIds }) => {
  return storageService.findChallengeByLevel({
    levelId,
    difficulty,
    excludeIds,
  });
};

const buildGenerationOverrides = (levelDef = {}, overrides = {}, difficulty) => ({
  ...overrides,
  levelId: overrides.levelId || levelDef.id,
  difficulty,
  type: overrides.type || levelDef.type,
  target: overrides.target || levelDef.target,
  tactic: overrides.tactic || levelDef.tactic,
});

const getMissionForLevel = async ({ levelId, playerLevel = 1, playerKey, overrides = {} }) => {
  const levelDef = findLevel(levelId);
  const baseDifficulty = overrides.difficulty || levelDef?.difficulty || 'medium';
  const scaledDifficulty = scaleDifficultyForPlayer(baseDifficulty, playerLevel);
  const excludeIds = await storageService.listPlayerChallengeIds(playerKey);
  const storedChallenge = await getExistingChallenge({
    levelId,
    difficulty: scaledDifficulty,
    excludeIds,
  });
  if (storedChallenge) return storedChallenge;
  return generateChallenge(buildGenerationOverrides(levelDef, overrides, scaledDifficulty));
};

module.exports = {
  getMissionForLevel,
};

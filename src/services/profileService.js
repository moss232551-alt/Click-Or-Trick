const { run } = require('./mysqlClient');
const { sortLevels, findLevel } = require('../data/levels');

const ensureProfile = async (userId, username) => {
  await run(
    `INSERT INTO profiles (user_id, display_name)
     VALUES (:userId, :displayName)
     ON DUPLICATE KEY UPDATE display_name = COALESCE(display_name, VALUES(display_name))`,
    { userId, displayName: username },
  );
  await ensureLevelProgress(userId);
};

const ensureLevelProgress = async (userId) => {
  const levels = sortLevels();
  const firstLevel = levels[0];
  const insertValues = levels.map((level) => ({
    userId,
    levelId: level.id,
    status: level.id === firstLevel.id ? 'unlocked' : 'locked',
  }));

  await Promise.all(
    insertValues.map((entry) =>
      run(
        `INSERT IGNORE INTO level_progress (user_id, level_id, status)
         VALUES (:userId, :levelId, :status)`,
        entry,
      ),
    ),
  );
};

const getProfile = async (userId) => {
  const rows = await run(
    `SELECT u.id AS userId,
            u.username,
            u.email,
            p.display_name AS displayName,
            p.avatar_url AS avatarUrl,
            p.bio,
            p.level,
            p.xp,
            p.score
       FROM users u
       JOIN profiles p ON p.user_id = u.id
      WHERE u.id = :userId
      LIMIT 1`,
    { userId },
  );
  return rows[0] || null;
};

const adjustScore = async ({ userId, deltaScore }) => {
  if (!userId || !Number.isFinite(deltaScore)) return;
  await run(
    `UPDATE profiles
        SET score = GREATEST(0, score + :deltaScore)
      WHERE user_id = :userId`,
    { userId, deltaScore },
  );
};

const getLevelProgress = async (userId) => {
  await ensureLevelProgress(userId);
  const rows = await run(
    `SELECT level_id AS levelId, status, best_score AS bestScore, last_played AS lastPlayed
       FROM level_progress
      WHERE user_id = :userId`,
    { userId },
  );
  const progressMap = new Map(rows.map((row) => [row.levelId, row]));
  return sortLevels().map((level) => ({
    ...level,
    status: progressMap.get(level.id)?.status || 'locked',
    bestScore: progressMap.get(level.id)?.bestScore || 0,
    lastPlayed: progressMap.get(level.id)?.lastPlayed || null,
  }));
};

const getScoreboard = async (limit = 10) => {
  const rows = await run(
    `SELECT u.username, p.display_name AS displayName, p.level, p.score
       FROM profiles p
       JOIN users u ON u.id = p.user_id
      ORDER BY p.score DESC, p.level DESC
      LIMIT :limit`,
    { limit },
  );
  return rows;
};

const applyMissionResult = async ({ userId, levelId, verdict, scoreDelta = 0, passed = false }) => {
  if (!userId) return;
  const verdictMap = { correct: 50, partial: 20, incorrect: -15 };
  const level = findLevel(levelId) || { xpReward: 50, scoreReward: 100 };
  const deltaScore = scoreDelta || level.scoreReward + (verdictMap[verdict] || 0);
  const deltaXp = level.xpReward;

  await run(
    `UPDATE profiles
        SET score = GREATEST(0, score + :scoreDelta),
            xp = GREATEST(0, xp + :xpDelta),
            level = FLOOR(xp / 200) + 1
      WHERE user_id = :userId`,
    { userId, scoreDelta: deltaScore, xpDelta: deltaXp },
  );

  if (levelId && passed) {
    await run(
      `UPDATE level_progress
          SET status = 'completed',
              best_score = GREATEST(best_score, :scoreDelta),
              last_played = CURRENT_TIMESTAMP
        WHERE user_id = :userId
          AND level_id = :levelId`,
      { userId, levelId, scoreDelta: deltaScore },
    );

    const currentLevel = findLevel(levelId);
    if (currentLevel?.unlocks?.length) {
      await Promise.all(
        currentLevel.unlocks.map((unlockId) =>
          run(
            `INSERT INTO level_progress (user_id, level_id, status)
             VALUES (:userId, :levelId, 'unlocked')
             ON DUPLICATE KEY UPDATE status = CASE
               WHEN status = 'locked' THEN 'unlocked'
               ELSE status
             END`,
            { userId, levelId: unlockId },
          ),
        ),
      );
    }
  }
};

const getFullProfile = async (userId) => {
  const [profile, levels, scoreboard] = await Promise.all([
    getProfile(userId),
    getLevelProgress(userId),
    getScoreboard(),
  ]);
  return { profile, levels, scoreboard };
};

module.exports = {
  ensureProfile,
  getProfile,
  getFullProfile,
  getLevelProgress,
  getScoreboard,
  applyMissionResult,
  adjustScore,
};

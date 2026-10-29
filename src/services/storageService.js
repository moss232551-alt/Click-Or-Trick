const { run, getPool } = require('./mysqlClient');

const persistChallenge = async (challenge) => {
  await run(
    `INSERT INTO challenges (id, type, difficulty, target, tactic, level_id, payload, source)
     VALUES (:id, :type, :difficulty, :target, :tactic, :levelId, :payload, :source)
     ON DUPLICATE KEY UPDATE
       type = VALUES(type),
       difficulty = VALUES(difficulty),
       target = VALUES(target),
       tactic = VALUES(tactic),
       level_id = VALUES(level_id),
       payload = VALUES(payload),
       source = VALUES(source)`,
    {
      id: challenge.id,
      type: challenge.type,
      difficulty: challenge.difficulty,
      target: challenge.target,
      tactic: challenge.tactic,
      levelId: challenge.levelId || null,
      payload: JSON.stringify(challenge),
      source: challenge.source,
    },
  );
  return { stored: true };
};

const findChallengeByLevel = async ({ levelId, difficulty, excludeIds = [] }) => {
  if (!levelId) return null;
  const params = { levelId, difficulty };
  let sql = `SELECT payload FROM challenges WHERE level_id = :levelId`;
  if (difficulty) {
    sql += ' AND difficulty = :difficulty';
  } else {
    delete params.difficulty;
  }
  if (excludeIds.length) {
    const placeholders = excludeIds.map((_, index) => `:exclude${index}`);
    sql += ` AND id NOT IN (${placeholders.join(',')})`;
    excludeIds.forEach((value, index) => {
      params[`exclude${index}`] = value;
    });
  }
  sql += ' ORDER BY created_at ASC LIMIT 1';
  const rows = await run(sql, params);
  if (!rows.length) return null;
  try {
    return JSON.parse(rows[0].payload);
  } catch (_error) {
    return null;
  }
};

const listPlayerChallengeIds = async (playerId) => {
  if (!playerId) return [];
  const rows = await run(
    `SELECT DISTINCT challenge_id AS challengeId
       FROM results
      WHERE player_id = :playerId`,
    { playerId },
  );
  return rows.map((row) => row.challengeId);
};

const recordResult = async (result) => {
  const pool = getPool();
  const [meta] = await pool.execute(
    `INSERT INTO results (challenge_id, player_id, player_answer, correct_answer, player_explanation, response_time_ms, score_delta, metadata)
     VALUES (:challengeId, :playerId, :playerAnswer, :correctAnswer, :playerExplanation, :responseTimeMs, :scoreDelta, :metadata)`,
    {
      challengeId: result.challengeId,
      playerId: result.playerId || null,
      playerAnswer: result.playerAnswer,
      correctAnswer: result.correctAnswer || null,
      playerExplanation: result.playerExplanation || null,
      responseTimeMs: typeof result.responseTimeMs === 'number' ? result.responseTimeMs : null,
      scoreDelta: typeof result.scoreDelta === 'number' ? result.scoreDelta : null,
      metadata: result.metadata ? JSON.stringify(result.metadata) : null,
    },
  );
  return { stored: true, id: meta.insertId };
};

const listRecentResults = async (limit = 10) => {
  const safeLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
  const rows = await run(
    `SELECT id,
            challenge_id   AS challengeId,
            player_id      AS playerId,
            player_answer  AS playerAnswer,
            correct_answer AS correctAnswer,
            player_explanation AS playerExplanation,
            ai_feedback AS aiFeedback,
            response_time_ms AS responseTimeMs,
            score_delta    AS scoreDelta,
            metadata,
            created_at     AS createdAt
       FROM results
       ORDER BY created_at DESC
       LIMIT :limit`,
    { limit: safeLimit },
  );

  return rows.map((row) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    aiFeedback: row.aiFeedback ? JSON.parse(row.aiFeedback) : null,
  }));
};

const fetchChallengeById = async (id) => {
  const rows = await run(
    `SELECT payload FROM challenges WHERE id = :id LIMIT 1`,
    { id },
  );
  if (!rows.length) return null;
  try {
    return JSON.parse(rows[0].payload);
  } catch (_error) {
    return null;
  }
};

const attachFeedbackToResult = async (resultId, feedback) => {
  if (!resultId) return { stored: false };
  await run(
    `UPDATE results
        SET ai_feedback = :feedback
      WHERE id = :id`,
    { id: resultId, feedback: JSON.stringify(feedback) },
  );
  return { stored: true };
};

module.exports = {
  persistChallenge,
  recordResult,
  listRecentResults,
  fetchChallengeById,
  attachFeedbackToResult,
  findChallengeByLevel,
  listPlayerChallengeIds,
};

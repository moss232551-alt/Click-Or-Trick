const SENSITIVE_FIELDS = ['answer', 'explanation', 'clues'];

const sanitizeChallengeForClient = (challenge) => {
  if (!challenge || typeof challenge !== 'object') return null;
  const sanitized = { ...challenge };
  SENSITIVE_FIELDS.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });
  const clues = Array.isArray(challenge.clues) ? challenge.clues : [];
  sanitized.clueCount = clues.length;
  sanitized.hasAnswer = Boolean(challenge.answer);
  sanitized.hasExplanation = Boolean(challenge.explanation);
  return sanitized;
};

module.exports = {
  sanitizeChallengeForClient,
};

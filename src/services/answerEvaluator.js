const { requestEvaluationFromAI } = require('./aiClient');

const buildFallbackFeedback = ({ challenge, playerAnswer, playerExplanation }) => {
  const isCorrect = challenge.answer === playerAnswer;
  return {
    verdict: isCorrect ? 'correct' : 'incorrect',
    playerAnswer,
    correctAnswer: challenge.answer,
    explanation: isCorrect
      ? 'Your classification matches the official answer. Great job spotting the phishing cues.'
      : `Expected ${challenge.answer} because of clues such as ${challenge.clues?.join(', ') || 'the suspicious indicators provided'}.`,
    playerFeedback: playerExplanation
      ? `You wrote: "${playerExplanation}"`
      : 'Share a short explanation next time so mentors can review your reasoning.',
    keyClues: challenge.clues || [],
    source: 'heuristic',
  };
};

const evaluateAnswer = async ({ challenge, playerAnswer, playerExplanation }) => {
  try {
    const feedback = await requestEvaluationFromAI({ challenge, playerAnswer, playerExplanation });
    return { ...feedback, source: 'ai' };
  } catch (error) {
    console.error('AI evaluation failed, using fallback:', error.message);
    return buildFallbackFeedback({ challenge, playerAnswer, playerExplanation });
  }
};

module.exports = {
  evaluateAnswer,
};

const OpenAI = require('openai');
const config = require('../config');

let cachedClient;

const getClient = () => {
  if (cachedClient || !config.openAi.apiKey) return cachedClient;
  cachedClient = new OpenAI({ apiKey: config.openAi.apiKey });
  return cachedClient;
};

const systemPrompt = `You are an AI phishing challenge generator for a cybersecurity learning game.
Deliver production-grade artefacts that feel real. Always:
- Use believable brands, domains, and URLs (no obvious placeholders like fake-site.com or example.org).
- Keep tone professional, like a genuine escalation target would receive.
- Avoid explicitly revealing the tactic inside the artefact.
Generate one scenario per request.`;
const evaluationSystemPrompt =
  'You review cybersecurity trainee answers. Compare their choice with the official answer, highlight the correct reasoning, and coach constructively.';

const makeUserPrompt = (params) => `Generate a phishing detection challenge with these parameters:
Type: ${params.type}
Difficulty: ${params.difficulty}
Target: ${params.target}
Tactic: ${params.tactic}
Output JSON with these fields:
{
  "type": "${params.type}",
  "difficulty": "${params.difficulty}",
  "from": "string",
  "subject": "string",
  "body": "string",
  "attachments": ["optional"],
  "clues": ["list of red flags"],
  "answer": "safe | suspicious | malicious",
  "explanation": "why"
}
Additional rules:
- The official correct answer MUST be "${params.answerGoal}".
- Rotate scenarios so that safe artefacts feel legitimate: when the answer is "safe", ensure the message is genuine and clues highlight why it should be trusted.
- When the answer is "suspicious" or "malicious", keep the red flags subtle but real.
- Provide at least three clues; if difficulty is "hard", the cues should be extremely nuanced and woven into believable context.
- Use realistic-looking domains/URLs (e.g., billing.contoso-payments.com, sharepoint.portal-hub.co) and never placeholders.
- Keep the narrative grounded in the specified target's context.
- Let the tactic influence the clues, but do not name it in the artefact body.`;

const parseResponse = (text) => {
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('JSON not found in AI response');
    }
    const candidate = text.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(candidate);
  } catch (error) {
    throw new Error(`Unable to parse AI response: ${error.message}`);
  }
};

const runOpenAi = async (messages) => {
  const client = getClient();
  if (!client) {
    throw new Error('Missing OPENAI_API_KEY for live generation');
  }
  const response = await client.responses.create({
    model: config.openAi.model,
    input: messages,
  });
  const textChunk = response.output?.[0]?.content?.[0]?.text;
  if (!textChunk) {
    throw new Error('Empty response from OpenAI');
  }
  return textChunk;
};

const requestChallengeFromAI = async (params) => {
  const textChunk = await runOpenAi([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: makeUserPrompt(params) },
  ]);
  return parseResponse(textChunk);
};

const makeEvaluationPrompt = ({ challenge, playerAnswer, playerExplanation }) => {
  const sanitizedExplanation = playerExplanation?.trim() || 'Player provided no explanation.';
  const condensedChallenge = {
    type: challenge.type,
    difficulty: challenge.difficulty,
    target: challenge.target,
    tactic: challenge.tactic,
    clues: challenge.clues,
    answer: challenge.answer,
    explanation: challenge.explanation,
  };

  return `Official challenge:\n${JSON.stringify(condensedChallenge, null, 2)}\n\nPlayer selected: ${playerAnswer}\nPlayer explanation: ${sanitizedExplanation}\n\nReturn JSON with:\n{\n  "verdict": "correct | incorrect | partial",\n  "playerAnswer": "${playerAnswer}",\n  "correctAnswer": "${challenge.answer}",\n  "explanation": "short reason highlighting real clues",\n  "playerFeedback": "constructive coaching sentence",\n  "keyClues": ["most important clues mentioned in explanation"]\n}`;
};

const requestEvaluationFromAI = async ({ challenge, playerAnswer, playerExplanation }) => {
  const textChunk = await runOpenAi([
    { role: 'system', content: evaluationSystemPrompt },
    { role: 'user', content: makeEvaluationPrompt({ challenge, playerAnswer, playerExplanation }) },
  ]);
  return parseResponse(textChunk);
};

module.exports = {
  requestChallengeFromAI,
  requestEvaluationFromAI,
};

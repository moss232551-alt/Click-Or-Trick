const options = {
  type: ['email', 'sms', 'chat', 'website', 'pdf'],
  difficulty: ['easy', 'medium', 'hard'],
  target: ['banking', 'e-commerce', 'social media', 'cloud', 'hr', 'education'],
  tactic: ['fake link', 'sender spoof', 'urgency', 'attachment malware', 'fake invoice', 'qr scam', 'credential harvest', 'reward scam'],
};

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

const weightedPick = (entries) => {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (roll <= cumulative) return entry.value;
  }
  return entries[entries.length - 1].value;
};

const buildChallengeParams = (incoming = {}) => ({
  type: incoming.type || randomFrom(options.type),
  difficulty:
    incoming.difficulty ||
    weightedPick([
      { value: 'hard', weight: 0.5 },
      { value: 'medium', weight: 0.35 },
      { value: 'easy', weight: 0.15 },
    ]),
  target: incoming.target || randomFrom(options.target),
  tactic: incoming.tactic || randomFrom(options.tactic),
});

module.exports = {
  options,
  buildChallengeParams,
};

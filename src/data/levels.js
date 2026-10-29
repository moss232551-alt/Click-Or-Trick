const levels = [
  { id: '1-2', label: 'HR Ping', difficulty: 'easy', order: 1, type: 'sms', target: 'hr', tactic: 'urgency', xpReward: 40, scoreReward: 120, unlocks: ['2-1'] },
  { id: '2-1', label: 'Cloud Sabotage', difficulty: 'medium', order: 2, type: 'chat', target: 'cloud', tactic: 'credential harvest', xpReward: 80, scoreReward: 160, unlocks: ['3-1'] },
  { id: '3-1', label: 'E-commerce Skim', difficulty: 'medium', order: 3, type: 'email', target: 'e-commerce', tactic: 'sender spoof', xpReward: 80, scoreReward: 160, unlocks: ['4-1'] },
  { id: '4-1', label: 'Social Maze', difficulty: 'medium', order: 5, type: 'website', target: 'social media', tactic: 'qr scam', xpReward: 100, scoreReward: 200, unlocks: ['5-1'] },
  { id: '5-1', label: 'Campus Intel', difficulty: 'hard', order: 6, type: 'pdf', target: 'education', tactic: 'attachment malware', xpReward: 120, scoreReward: 240, unlocks: ['6-1'] },
  { id: '6-1', label: 'Wire Fraud', difficulty: 'hard', order: 7, type: 'sms', target: 'banking', tactic: 'fake link', xpReward: 120, scoreReward: 250, unlocks: ['7-1'] },
  { id: '7-1', label: 'Cloud Backdoor', difficulty: 'hard', order: 8, type: 'email', target: 'cloud', tactic: 'credential harvest', xpReward: 150, scoreReward: 280, unlocks: ['8-1'] },
  { id: '8-1', label: 'HR Spoof Chain', difficulty: 'hard', order: 9, type: 'chat', target: 'hr', tactic: 'reward scam', xpReward: 150, scoreReward: 300, unlocks: ['9-1'] },
  { id: '9-1', label: 'Storefront Sting', difficulty: 'hard', order: 10, type: 'website', target: 'e-commerce', tactic: 'fake invoice', xpReward: 180, scoreReward: 320, unlocks: ['10-1'] },
  { id: '10-1', label: 'Vault Finale', difficulty: 'hard', order: 11, type: 'email', target: 'banking', tactic: 'urgency', xpReward: 200, scoreReward: 400, unlocks: [] },
];

const sortLevels = () => levels.slice().sort((a, b) => a.order - b.order);

const findLevel = (levelId) => levels.find((level) => level.id === levelId);

module.exports = {
  levels,
  sortLevels,
  findLevel,
};

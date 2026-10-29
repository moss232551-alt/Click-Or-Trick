import type { LevelDefinition } from '../types';

export const defaultLevels: LevelDefinition[] = [
  { id: '1-2', label: 'HR Ping', difficulty: 'easy', type: 'sms', target: 'hr', tactic: 'urgency', xpReward: 40, scoreReward: 120 },
  { id: '2-1', label: 'Cloud Sabotage', difficulty: 'medium', type: 'chat', target: 'cloud', tactic: 'credential harvest', xpReward: 80, scoreReward: 160 },
  { id: '3-1', label: 'E-commerce Skim', difficulty: 'medium', type: 'email', target: 'e-commerce', tactic: 'sender spoof', xpReward: 80, scoreReward: 160 },
  { id: '4-1', label: 'Social Maze', difficulty: 'medium', type: 'website', target: 'social media', tactic: 'qr scam', xpReward: 100, scoreReward: 200 },
  { id: '5-1', label: 'Campus Intel', difficulty: 'hard', type: 'pdf', target: 'education', tactic: 'attachment malware', xpReward: 120, scoreReward: 240 },
  { id: '6-1', label: 'Wire Fraud', difficulty: 'hard', type: 'sms', target: 'banking', tactic: 'fake link', xpReward: 120, scoreReward: 250 },
  { id: '7-1', label: 'Cloud Backdoor', difficulty: 'hard', type: 'email', target: 'cloud', tactic: 'credential harvest', xpReward: 150, scoreReward: 280 },
  { id: '8-1', label: 'HR Spoof Chain', difficulty: 'hard', type: 'chat', target: 'hr', tactic: 'reward scam', xpReward: 150, scoreReward: 300 },
  { id: '9-1', label: 'Storefront Sting', difficulty: 'hard', type: 'website', target: 'e-commerce', tactic: 'fake invoice', xpReward: 180, scoreReward: 320 },
  { id: '10-1', label: 'Vault Finale', difficulty: 'hard', type: 'email', target: 'banking', tactic: 'urgency', xpReward: 200, scoreReward: 400 },
];

export default defaultLevels;

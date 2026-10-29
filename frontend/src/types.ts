export type Verdict = 'safe' | 'suspicious' | 'malicious';

export interface Challenge {
  id: string;
  type?: string;
  difficulty?: string;
  target?: string;
  tactic?: string;
  from?: string;
  subject: string;
  body: string;
  attachments?: string[];
  source?: string;
  levelId?: string;
  clueCount?: number;
  hasAnswer?: boolean;
  hasExplanation?: boolean;
}

export type FeedbackVerdict = 'correct' | 'incorrect' | 'partial';

export interface MentorFeedback {
  verdict: FeedbackVerdict;
  playerAnswer: Verdict;
  correctAnswer: Verdict;
  explanation: string;
  playerFeedback?: string;
  keyClues?: string[];
  source?: string;
}

export interface PublicFeedback {
  verdict: FeedbackVerdict;
  playerAnswer: Verdict;
  explanation?: string;
  playerFeedback?: string;
  source?: string;
}

export interface ChallengeResultPayload {
  challengeId: string;
  playerId?: string;
  playerAnswer: Verdict;
  playerExplanation: string;
  responseTimeMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ChallengeResultResponse {
  status: 'stored' | 'queued';
  feedback: MentorFeedback | null;
  correctAnswer: Verdict | null;
}

export interface RecentResult {
  id: number;
  challengeId: string;
  playerId?: string | null;
  playerAnswer: Verdict;
  playerExplanation?: string | null;
  responseTimeMs?: number | null;
  scoreDelta?: number | null;
  metadata?: Record<string, unknown> | null;
  aiFeedback?: PublicFeedback | null;
  createdAt: string;
}

export interface RecentResultList {
  count: number;
  items: RecentResult[];
}

export type ChallengeRequestOverrides = Partial<
  Pick<Challenge, 'type' | 'difficulty' | 'target' | 'tactic' | 'levelId'>
> & {
  playerLevel?: number;
  playerKey?: string;
  playerId?: string;
};

export interface HealthStatus {
  status: string;
  timestamp: number;
}

export interface UserProfile {
  userId: number;
  username: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  level: number;
  xp: number;
  score: number;
}

export interface LevelDefinition {
  id: string;
  label: string;
  difficulty: string;
  type: string;
  target: string;
  tactic: string;
  xpReward: number;
  scoreReward: number;
  status?: 'locked' | 'unlocked' | 'completed';
  bestScore?: number;
  lastPlayed?: string | null;
}

export interface ProfileResponse {
  profile: UserProfile | null;
  levels: LevelDefinition[];
  scoreboard: Array<{ username: string; displayName: string | null; level: number; score: number }>;
}

export interface AuthResponse extends ProfileResponse {
  token: string;
}

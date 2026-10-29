import type {
  AuthResponse,
  Challenge,
  ChallengeRequestOverrides,
  ChallengeResultPayload,
  ChallengeResultResponse,
  FeedbackVerdict,
  HealthStatus,
  LevelDefinition,
  ProfileResponse,
  RecentResultList,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://clickortrick.pgthegod.space/api';
let authToken: string | null = null;

export const setApiAuthToken = (token: string | null) => {
  authToken = token;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const fetchChallenge = async (overrides: ChallengeRequestOverrides = {}): Promise<Challenge | null> => {
  try {
    return await request<Challenge>('/challenges/generate', {
      method: 'POST',
      body: JSON.stringify(overrides),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Falling back to mock challenge:', error.message);
    }
    return null;
  }
};

export const submitResult = async (
  payload: ChallengeResultPayload,
): Promise<ChallengeResultResponse | null> => {
  try {
    return await request<ChallengeResultResponse>('/challenges/results', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Result submission failed:', error.message);
    }
    return null;
  }
};

export const getSamples = () =>
  request<{ count: number; items: Challenge[] }>('/challenges/samples', { method: 'GET' });

export const fetchRecentResults = async (limit = 5) => {
  const clampedLimit = Math.min(Math.max(limit, 1), 20);
  return request<RecentResultList>(`/challenges/results/recent?limit=${clampedLimit}`, {
    method: 'GET',
  });
};

export const getHealthStatus = () =>
  request<HealthStatus>('/health', {
    method: 'GET',
  });

export const registerUser = (payload: { username: string; email: string; password: string }) =>
  request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const loginUser = (payload: { identifier: string; password: string }) =>
  request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchProfile = () =>
  request<ProfileResponse>('/profile', {
    method: 'GET',
  });

export const updateProgress = (payload: { levelId: string; verdict: FeedbackVerdict; scoreDelta?: number }) =>
  request<ProfileResponse>('/profile/progress', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchLevels = () =>
  request<{ items: LevelDefinition[] }>('/levels', {
    method: 'GET',
  });

export const fetchScoreboard = () =>
  request<{ items: Array<{ username: string; displayName: string | null; level: number; score: number }> }>(
    '/profile/scoreboard',
    { method: 'GET' },
  );

export const revealClue = async (payload: { levelId: string; challengeId: string; clueIndex: number }) => {
  return request<{ status: string; cost: number; clue?: string; clueIndex: number }>('/challenges/clues/reveal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchProfile,
  loginUser,
  registerUser,
  setApiAuthToken,
  updateProgress as updateProgressApi,
} from '../api';
import type { FeedbackVerdict, ProfileResponse } from '../types';

type AuthContextValue = {
  token: string | null;
  profile: ProfileResponse | null;
  loading: boolean;
  signIn: (payload: { identifier: string; password: string }) => Promise<void>;
  signUp: (payload: { username: string; email: string; password: string }) => Promise<void>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  updateProgress: (payload: { levelId: string; verdict: FeedbackVerdict; scoreDelta?: number }) => Promise<void>;
  adoptToken: (token: string) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = 'clickortrick-token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(TOKEN_KEY));
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    setApiAuthToken(token);
    if (!token) {
      window.localStorage.removeItem(TOKEN_KEY);
      setProfile(null);
      setLoading(false);
      return;
    }
    window.localStorage.setItem(TOKEN_KEY, token);
    setLoading(true);
    fetchProfile()
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [token]);

  const signIn = useCallback(async (credentials: { identifier: string; password: string }) => {
    const response = await loginUser(credentials);
    setToken(response.token);
    setProfile({ profile: response.profile, levels: response.levels, scoreboard: response.scoreboard });
  }, []);

  const signUp = useCallback(async (payload: { username: string; email: string; password: string }) => {
    const response = await registerUser(payload);
    setToken(response.token);
    setProfile({ profile: response.profile, levels: response.levels, scoreboard: response.scoreboard });
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const data = await fetchProfile();
    setProfile(data);
  }, []);

  const updateProgress = useCallback(
    async (payload: { levelId: string; verdict: FeedbackVerdict; scoreDelta?: number }) => {
      const response = await updateProgressApi(payload);
      setProfile(response);
    },
    [],
  );

  const adoptToken = useCallback((tokenValue: string) => {
    setToken(tokenValue);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProgress,
      adoptToken,
    }),
    [token, profile, loading, signIn, signUp, signOut, refreshProfile, updateProgress, adoptToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

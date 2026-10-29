export type StoredUser = {
  username: string;
  email: string;
  password: string;
  createdAt: string;
};

const USERS_KEY = 'clickortrick-users';
const SESSION_KEY = 'clickortrick-session';

const inBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readStorage = <T>(key: string, fallback: T): T => {
  if (!inBrowser()) return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored) as T;
  } catch (_error) {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (!inBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const listUsers = (): StoredUser[] => readStorage<StoredUser[]>(USERS_KEY, []);

export const saveUsers = (users: StoredUser[]) => writeStorage(USERS_KEY, users);

export const registerUser = (data: { username: string; email: string; password: string }) => {
  const users = listUsers();
  const usernameExists = users.some((user) => user.username.toLowerCase() === data.username.toLowerCase());
  if (usernameExists) {
    throw new Error('Username already taken. Pick something unique.');
  }
  const emailExists = users.some((user) => user.email.toLowerCase() === data.email.toLowerCase());
  if (emailExists) {
    throw new Error('Email already registered. Log in instead.');
  }
  const newUser: StoredUser = {
    username: data.username.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  writeStorage(SESSION_KEY, { username: newUser.username, email: newUser.email });
  return newUser;
};

export const authenticate = (identifier: string, password: string): StoredUser => {
  const users = listUsers();
  const normalized = identifier.trim().toLowerCase();
  const matchedUser = users.find(
    (user) => user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized,
  );
  if (!matchedUser) {
    throw new Error('Unknown username or email.');
  }
  if (matchedUser.password !== password) {
    throw new Error('Incorrect password.');
  }
  writeStorage(SESSION_KEY, { username: matchedUser.username, email: matchedUser.email });
  return matchedUser;
};

export const getCurrentUser = () => readStorage<{ username: string; email: string } | null>(SESSION_KEY, null);

export const logout = () => {
  if (!inBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
};

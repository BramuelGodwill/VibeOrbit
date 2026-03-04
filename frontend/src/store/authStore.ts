import { create } from 'zustand';

interface User {
  id:         string;
  email:      string;
  username:   string;
  avatar_url?: string;
  is_premium: boolean;
}

interface AuthState {
  token:           string | null;
  user:            User | null;
  setAuth:         (token: string, user: User) => void;
  setUser:         (user: User) => void;
  logout:          () => void;
  isAuthenticated: () => boolean;
}

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vb_token');
};

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const u = localStorage.getItem('vb_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user:  getStoredUser(),

  setAuth: (token, user) => {
    localStorage.setItem('vb_token', token);
    localStorage.setItem('vb_user',  JSON.stringify(user));
    set({ token, user });
  },

  setUser: (user) => {
    localStorage.setItem('vb_user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    set({ token: null, user: null });
  },

  isAuthenticated: () => !!get().token,
}));

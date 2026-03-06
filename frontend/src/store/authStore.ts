import { create } from 'zustand';

const ADMIN_EMAIL = 'bramuelgodwill7@gmail.com';

interface User {
  id:          string;
  email:       string;
  username:    string;
  avatar_url?: string;
  is_premium:  boolean;
  created_at?: string;
}

interface AuthStore {
  token:           string | null;
  user:            User   | null;
  setAuth:         (token: string, user: User) => void;
  setUser:         (user: User) => void;
  logout:          () => void;
  isAuthenticated: () => boolean;
  isAdmin:         () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => {
  const saved = typeof window !== 'undefined'
    ? { token: localStorage.getItem('vb_token'), user: JSON.parse(localStorage.getItem('vb_user') || 'null') }
    : { token: null, user: null };

  return {
    token: saved.token,
    user:  saved.user,

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

    isAdmin: () => get().user?.email === ADMIN_EMAIL,
  };
});

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import request from '../utils/request';
import { User, UserRole } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name: string, phone?: string) => Promise<void>;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (username, password) => {
        const res: any = await request.post('/auth/login', { username, password });
        set({ token: res.token, user: res.user });
      },
      register: async (username, password, name, phone) => {
        const res: any = await request.post('/auth/register', { username, password, name, phone });
        set({ token: res.token, user: res.user });
      },
      fetchUser: async () => {
        try {
          const res: any = await request.get('/auth/profile');
          set({ user: res });
        } catch (error) {
          set({ token: null, user: null });
          throw error;
        }
      },
      logout: () => {
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

type AuthValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function storedUser(): User | null {
  try {
    const value = sessionStorage.getItem('lia_user');
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(storedUser);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      login: async (email: string, password: string) => {
        const result = await api<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        sessionStorage.setItem('lia_token', result.token);
        sessionStorage.setItem('lia_user', JSON.stringify(result.user));
        setUser(result.user);
      },
      changePassword: async (newPassword: string) => {
        const result = await api<{ token: string; user: User }>('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ newPassword }),
        });
        sessionStorage.setItem('lia_token', result.token);
        sessionStorage.setItem('lia_user', JSON.stringify(result.user));
        setUser(result.user);
      },
      logout: () => {
        sessionStorage.removeItem('lia_token');
        sessionStorage.removeItem('lia_user');
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthContext no está disponible');
  return value;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api';
import { refreshSession, setAccessToken } from '../api/client';
import type { AuthResponse, User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Pulihkan sesi dari cookie refresh saat aplikasi dibuka
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (await refreshSession()) {
        try {
          const me = await api.me();
          if (!cancelled) setUser(me);
        } catch {
          setAccessToken(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback((res: AuthResponse) => {
    setAccessToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(async (email: string, password: string) => apply(await api.login({ email, password })), [apply]);

  const register = useCallback(
    async (name: string, email: string, password: string) => apply(await api.register({ email, password, name })),
    [apply],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}

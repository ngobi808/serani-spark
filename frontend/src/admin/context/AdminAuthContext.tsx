import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminApi, ADMIN_TOKEN_KEY, AdminMe } from '../api/adminClient';

interface AdminAuthValue {
  token: string | null;
  /** Who is signed in, loaded from the server. Null until it arrives. */
  user: AdminMe | null;
  /** True while a signed-in person's details are still being fetched. */
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /**
   * Whether the signed-in person's role includes a permission. This only decides
   * what to SHOW. The server independently refuses anything not allowed.
   */
  can: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [user, setUser] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!localStorage.getItem(ADMIN_TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      setUser(await adminApi.getMe(token));
    } catch (err: any) {
      // An expired/invalid login is handled centrally (redirect to login).
      // Any other failure just leaves the person unloaded, so nothing is shown by mistake.
      if (err?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    setLoading(true);
    refreshUser();
  }, [token, refreshUser]);

  function login(newToken: string) {
    localStorage.setItem(ADMIN_TOKEN_KEY, newToken);
    setToken(newToken);
  }

  const can = (permission: string) => !!user && user.permissions.includes(permission);

  return (
    <AdminAuthContext.Provider value={{ token, user, loading, login, logout, refreshUser, can }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { customerApi, CUSTOMER_TOKEN_KEY, CustomerAccount } from '../api/customerClient';

interface CustomerAuthValue {
  token: string | null;
  account: CustomerAccount | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshAccount: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthValue | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(CUSTOMER_TOKEN_KEY));
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!localStorage.getItem(CUSTOMER_TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    setToken(null);
    setAccount(null);
    setLoading(false);
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!token) return;
    try {
      setAccount(await customerApi.getMe(token));
    } catch {
      logout(); // expired/invalid token
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) { setAccount(null); setLoading(false); return; }
    setLoading(true);
    refreshAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function login(newToken: string) {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, newToken);
    setToken(newToken);
  }

  return (
    <CustomerAuthContext.Provider value={{ token, account, loading, login, logout, refreshAccount }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}

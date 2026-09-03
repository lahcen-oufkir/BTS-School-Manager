"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getErrorMessage, TOKEN_KEY } from "./api";
import type { LoginResponse, MeResponse, User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hasStoredToken(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(TOKEN_KEY) !== null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasStoredToken);

  useEffect(() => {
    if (!hasStoredToken()) {
      return;
    }
    let active = true;
    api
      .get<MeResponse>("/auth/me")
      .then(({ data }) => {
        if (active) {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (active) {
          window.localStorage.removeItem(TOKEN_KEY);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.post<LoginResponse>("/auth/login", { email, password });
      window.localStorage.setItem(TOKEN_KEY, data.data.token);
      setUser(data.data.user);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors on logout
    } finally {
      window.localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(
    (permission: string) => user?.permissions?.includes(permission) ?? false,
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, hasPermission }),
    [user, loading, login, logout, hasPermission],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
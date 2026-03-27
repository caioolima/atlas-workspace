"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest, ApiError, BACKEND_ORIGIN } from "@/lib/api";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from "@/lib/auth-storage";
import type { AuthResponse, User } from "@/types";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  startGoogleLogin: () => void;
  setSessionFromTokens: (tokens: {
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  authenticatedFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearStoredTokens();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    setUser(response.user);
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setStoredTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
  }, []);

  const refreshSession = useCallback(async () => {
    const storedTokens = getStoredTokens();

    if (!storedTokens.refreshToken) {
      clearSession();
      return null;
    }

    const response = await apiRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        refreshToken: storedTokens.refreshToken,
      }),
    });

    applyAuthResponse(response);
    return response.accessToken;
  }, [applyAuthResponse, clearSession]);

  const setSessionFromTokens = useCallback(
    async (tokens: { accessToken: string; refreshToken: string }) => {
      setStoredTokens(tokens);
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);

      const profile = await apiRequest<User>("/auth/me", {}, tokens.accessToken);
      setUser(profile);
    },
    [],
  );

  const authenticatedFetch = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      const activeToken = accessToken ?? getStoredTokens().accessToken;

      try {
        return await apiRequest<T>(path, init, activeToken);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const nextToken = await refreshSession();

          if (nextToken) {
            return apiRequest<T>(path, init, nextToken);
          }
        }

        throw error;
      }
    },
    [accessToken, refreshSession],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const response = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });

      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const response = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });

      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const logout = useCallback(async () => {
    const currentRefreshToken = refreshToken ?? getStoredTokens().refreshToken;

    if (currentRefreshToken) {
      try {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify({
            refreshToken: currentRefreshToken,
          }),
        });
      } catch {
        // Logout should be resilient even if the token has expired.
      }
    }

    clearSession();
  }, [clearSession, refreshToken]);

  const startGoogleLogin = useCallback(() => {
    window.location.href = `${BACKEND_ORIGIN}/api/auth/google`;
  }, []);

  useEffect(() => {
    const storedTokens = getStoredTokens();

    if (!storedTokens.accessToken && !storedTokens.refreshToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      try {
        const initialAccessToken =
          storedTokens.accessToken ?? (await refreshSession());

        if (!initialAccessToken) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        const profile = await apiRequest<User>("/auth/me", {}, initialAccessToken);

        if (!cancelled) {
          setUser(profile);
          setAccessToken(initialAccessToken);
          setRefreshToken(storedTokens.refreshToken);
        }
      } catch {
        try {
          const nextToken = await refreshSession();

          if (nextToken && !cancelled) {
            const profile = await apiRequest<User>("/auth/me", {}, nextToken);
            setUser(profile);
          }
        } catch {
          if (!cancelled) {
            clearSession();
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession, refreshSession]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      loading,
      login,
      register,
      logout,
      startGoogleLogin,
      setSessionFromTokens,
      authenticatedFetch,
    }),
    [
      accessToken,
      authenticatedFetch,
      loading,
      login,
      logout,
      refreshToken,
      register,
      setSessionFromTokens,
      startGoogleLogin,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
}

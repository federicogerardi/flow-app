import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// ── Token Store (module-level, never localStorage) ──────────────────────────

let inMemoryToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Refresh at 80% of TTL so the token never expires while the tab is open */
const REFRESH_MARGIN = 0.8;

export function getAccessToken(): string | null {
  return inMemoryToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryToken = token;
}

function scheduleProactiveRefresh(expiresIn: number): void {
  clearRefreshTimer();
  const delay = Math.floor(expiresIn * 1000 * REFRESH_MARGIN);
  // Minimum 60s to avoid tight loops on misconfigured TTLs
  const clamped = Math.max(delay, 60_000);
  refreshTimer = setTimeout(() => {
    attemptTokenRefresh();
  }, clamped);
}

function clearRefreshTimer(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

// ── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Auth API helpers (direct fetch, no auth required) ───────────────────────

const API_BASE = import.meta.env.VITE_API_URL as string || '';

async function authFetch(
  path: string,
  body?: Record<string, unknown>,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error?.error?.message ?? error?.message ?? `Auth request failed: ${response.status}`,
    );
  }

  return response.json();
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: attempt silent refresh via httpOnly cookie
  useEffect(() => {
    let cancelled = false;

    async function trySilentRefresh() {
      try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          // Refresh cookie not ready (e.g. OAuth race) — try in-memory token
          const existingToken = getAccessToken();
          if (existingToken) {
            try {
              const meResponse = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${existingToken}` },
                credentials: 'include',
              });
              if (meResponse.ok) {
                const meData = await meResponse.json();
                if (!cancelled) {
                  setUser(meData.user ?? meData);
                  return;
                }
              }
              setAccessToken(null);
            } catch {
              setAccessToken(null);
            }
          }
          return;
        }

        const data: AuthResponse = await response.json();
        if (!cancelled) {
          setAccessToken(data.accessToken);
          setUser(data.user);
          scheduleProactiveRefresh(data.expiresIn);
        }
      } catch {
        // Network error — user will see login page
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    trySilentRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetch('/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    scheduleProactiveRefresh(data.expiresIn);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await authFetch('/register', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    scheduleProactiveRefresh(data.expiresIn);
  }, []);

  const logout = useCallback(async () => {
    clearRefreshTimer();
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// ── Refresh helper (used by API client interceptor) ─────────────────────────

export async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) {
    const token = await refreshPromise;
    return token !== null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) return null;

      const data: AuthResponse = await response.json();
      setAccessToken(data.accessToken);
      scheduleProactiveRefresh(data.expiresIn);
      return data.accessToken;
    } catch {
      return null;
    }
  })();

  try {
    const token = await refreshPromise;
    return token !== null;
  } finally {
    refreshPromise = null;
  }
}
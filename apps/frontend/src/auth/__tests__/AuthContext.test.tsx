import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth, getAccessToken, setAccessToken, attemptTokenRefresh } from '../AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function Consumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <button data-testid="login" onClick={() => auth.login('a@b.com', 'pass')}>
        Login
      </button>
      <button data-testid="logout" onClick={() => auth.logout()}>
        Logout
      </button>
    </div>
  );
}

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  vi.useFakeTimers();
  setAccessToken(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  describe('useAuth', () => {
    it('throws when used outside AuthProvider', () => {
      function BareConsumer() {
        useAuth();
        return null;
      }
      expect(() => render(<BareConsumer />)).toThrow(
        'useAuth must be used within an AuthProvider',
      );
    });
  });

  describe('AuthProvider', () => {
    it('renders children', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(
          <AuthProvider>
            <div>Child content</div>
          </AuthProvider>,
        );
        // Flush the mount effect microtasks without triggering long timers
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.getByText('Child content')).toBeDefined();
    });

    it('starts with isLoading true and eventually settles', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId('loading').textContent).toBe('true');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  // ── Proactive token refresh ─────────────────────────────────────────────

  describe('proactive token refresh', () => {
    const authResponse = (expiresIn = 900) => ({
      user: { id: 'u-1', email: 'a@b.com', role: 'member' },
      accessToken: 'at-123',
      expiresIn,
    });

    it('schedules a timer at 80% of expiresIn after successful login', async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      mockFetch
        // Mount silent refresh (fail — user not logged in yet)
        .mockRejectedValueOnce(new Error('Network error'))
        // Login fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => authResponse(900),
        });

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100); // settle mount
      });

      // Reset spy to only count post-mount timers
      setTimeoutSpy.mockClear();

      await act(async () => {
        screen.getByTestId('login').click();
        // Flush the login fetch & state update
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should have scheduled a proactive refresh at 80% of 900s = 720_000ms
      const timerArgs = setTimeoutSpy.mock.calls.find(
        ([, delay]) => typeof delay === 'number' && delay === 720_000,
      );
      expect(timerArgs).toBeDefined();
    });

    it('reschedules on subsequent successful refresh (clears old timer)', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      // Mount: silent refresh succeeds → schedules first timer
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => authResponse(900),
      });

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      const clearCountAfterMount = clearTimeoutSpy.mock.calls.length;

      // Trigger a manual refresh (simulating 401 interceptor)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => authResponse(900),
      });

      await attemptTokenRefresh();

      // Should have cleared the old timer before scheduling the new one
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(clearCountAfterMount + 1);
    });

    it('clears the proactive refresh timer on logout', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => authResponse(900),
      });

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100); // settle mount + schedule
      });

      // Record how many clearTimeout calls from mount
      const clearCountBeforeLogout = clearTimeoutSpy.mock.calls.length;

      await act(async () => {
        screen.getByTestId('logout').click();
        await vi.advanceTimersByTimeAsync(100);
      });

      // At least one more clearTimeout call for the proactive refresh timer
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(clearCountBeforeLogout);
    });

    it('does NOT schedule proactive refresh when mount refresh fails', async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // No timer with a large delay (≥ 60s) should have been scheduled
      const proactiveTimers = setTimeoutSpy.mock.calls.filter(
        ([, delay]) => typeof delay === 'number' && delay >= 60_000,
      );
      expect(proactiveTimers).toHaveLength(0);
    });

    it('clamps delay to minimum 60 seconds for short TTLs', async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      // Mount fails, login with absurdly short TTL
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => authResponse(30), // 30s → 80% = 24s → clamped to 60s
        });

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      setTimeoutSpy.mockClear();

      await act(async () => {
        screen.getByTestId('login').click();
        await vi.advanceTimersByTimeAsync(100);
      });

      const proactiveTimers = setTimeoutSpy.mock.calls.filter(
        ([, delay]) => typeof delay === 'number' && delay >= 60_000,
      );
      expect(proactiveTimers).toHaveLength(1);
      expect(proactiveTimers[0][1]).toBe(60_000); // clamped, not 24_000
    });
  });

  // ── Token store ─────────────────────────────────────────────────────────

  describe('getAccessToken / setAccessToken', () => {
    it('returns null by default', () => {
      expect(getAccessToken()).toBeNull();
    });

    it('stores and retrieves an in-memory token', () => {
      setAccessToken('test-token');
      expect(getAccessToken()).toBe('test-token');
    });

    it('clears the token when set to null', () => {
      setAccessToken('test-token');
      setAccessToken(null);
      expect(getAccessToken()).toBeNull();
    });
  });
});
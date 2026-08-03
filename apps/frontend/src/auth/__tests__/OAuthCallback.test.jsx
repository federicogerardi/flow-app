import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { OAuthCallback } from '../OAuthCallback';
import { setAccessToken } from '../AuthContext';
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});
vi.mock('../AuthContext', () => ({
    setAccessToken: vi.fn(),
}));
function renderOAuthCallback(search) {
    Object.defineProperty(window, 'location', {
        value: { search, pathname: '/auth/callback' },
        writable: true,
    });
    return render(<MemoryRouter>
      <OAuthCallback />
    </MemoryRouter>);
}
describe('OAuthCallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('calls setAccessToken and navigates to /dashboard when token is present', () => {
        renderOAuthCallback('?token=abc123');
        expect(vi.mocked(setAccessToken)).toHaveBeenCalledWith('abc123');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
    it('navigates to /login?error=oauth_failed when error param is present', () => {
        renderOAuthCallback('?error=access_denied');
        expect(vi.mocked(setAccessToken)).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login?error=oauth_failed', { replace: true });
    });
    it('navigates to /login when no token or error is present', () => {
        renderOAuthCallback('');
        expect(vi.mocked(setAccessToken)).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
    it('renders spinner while processing', () => {
        renderOAuthCallback('?token=abc123');
        expect(screen.getByRole('progressbar')).toBeDefined();
        expect(screen.getByText('Completing sign in...')).toBeDefined();
    });
});
//# sourceMappingURL=OAuthCallback.test.js.map
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthGuard } from '../AuthGuard';
import { useAuth } from '../AuthContext';
vi.mock('../AuthContext', () => ({
    useAuth: vi.fn(),
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
}));
function renderWithRouter() {
    return render(<MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AuthGuard />}>
          <Route path="/" element={<div>Protected</div>}/>
        </Route>
        <Route path="/login" element={<div>Login Page</div>}/>
      </Routes>
    </MemoryRouter>);
}
describe('AuthGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('shows spinner when loading', () => {
        vi.mocked(useAuth).mockReturnValue({
            isLoading: true,
            isAuthenticated: false,
            user: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
        });
        renderWithRouter();
        expect(screen.getByRole('progressbar')).toBeDefined();
        expect(screen.queryByText('Protected')).toBeNull();
        expect(screen.queryByText('Login Page')).toBeNull();
    });
    it('redirects to /login when not authenticated and not loading', () => {
        vi.mocked(useAuth).mockReturnValue({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
        });
        renderWithRouter();
        expect(screen.getByText('Login Page')).toBeDefined();
        expect(screen.queryByText('Protected')).toBeNull();
        expect(screen.queryByRole('progressbar')).toBeNull();
    });
    it('renders <Outlet /> when authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({
            isLoading: false,
            isAuthenticated: true,
            user: { id: 'user-1', email: 'test@example.com', role: 'member' },
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
        });
        renderWithRouter();
        expect(screen.getByText('Protected')).toBeDefined();
        expect(screen.queryByText('Login Page')).toBeNull();
        expect(screen.queryByRole('progressbar')).toBeNull();
    });
});
//# sourceMappingURL=AuthGuard.test.js.map
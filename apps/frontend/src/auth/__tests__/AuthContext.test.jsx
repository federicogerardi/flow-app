import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth, getAccessToken, setAccessToken } from '../AuthContext';
vi.mock('../AuthContext', async () => {
    const actual = await vi.importActual('../AuthContext');
    return actual;
});
describe('AuthContext', () => {
    describe('useAuth', () => {
        it('throws when used outside AuthProvider', () => {
            function Consumer() {
                useAuth();
                return null;
            }
            expect(() => render(<Consumer />)).toThrow('useAuth must be used within an AuthProvider');
        });
    });
    describe('AuthProvider', () => {
        beforeEach(() => {
            setAccessToken(null);
        });
        it('renders children', async () => {
            render(<AuthProvider>
          <div>Child content</div>
        </AuthProvider>);
            expect(screen.getByText('Child content')).toBeDefined();
        });
        it('starts with isLoading true and eventually settles', async () => {
            function Consumer() {
                const { isLoading } = useAuth();
                return <div>Loading: {String(isLoading)}</div>;
            }
            render(<AuthProvider>
          <Consumer />
        </AuthProvider>);
            expect(screen.getByText('Loading: true')).toBeDefined();
        });
    });
    describe('getAccessToken / setAccessToken', () => {
        beforeEach(() => {
            setAccessToken(null);
        });
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
//# sourceMappingURL=AuthContext.test.js.map
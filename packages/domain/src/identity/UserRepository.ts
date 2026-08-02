import type { User } from './User';
import type { AuthSession } from './AuthSession';
import type { OAuthAccount } from './OAuthAccount';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  saveAuthSession(session: AuthSession): Promise<void>;
  findByRefreshToken(token: string): Promise<AuthSession | null>;
  deleteAuthSession(id: string): Promise<void>;
  deleteAllAuthSessionsForUser(userId: string): Promise<void>;
  saveOAuthAccount(account: OAuthAccount): Promise<void>;
  findByOAuth(provider: string, providerId: string): Promise<OAuthAccount | null>;
}

import type { Kysely } from 'kysely';
import type { DB } from '../types';
import {
  User,
  Email,
  UserRole,
  UserStatus,
  type UserRepository,
  type AuthSession,
  type OAuthAccount,
} from '@flow-app/domain';

export class KyselyUserRepository implements UserRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db
      .selectFrom('users')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .selectFrom('users')
      .where('email', '=', email.toLowerCase())
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async save(user: User): Promise<void> {
    await this.db
      .insertInto('users')
      .values({
        id: user.id,
        email: user.email.toString(),
        password_hash: user.passwordHash,
        role: user.role.toString(),
        status: user.status.toString(),
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          email: user.email.toString(),
          password_hash: user.passwordHash,
          role: user.role.toString(),
          status: user.status.toString(),
          updated_at: new Date(),
        }),
      )
      .execute();
  }

  async saveAuthSession(session: AuthSession): Promise<void> {
    await this.db
      .insertInto('auth_sessions')
      .values({
        id: session.id,
        user_id: session.userId,
        refresh_token: session.refreshToken,
        expires_at: session.expiresAt,
      })
      .execute();
  }

  async findByRefreshToken(token: string): Promise<AuthSession | null> {
    const row = await this.db
      .selectFrom('auth_sessions')
      .where('refresh_token', '=', token)
      .where('expires_at', '>', new Date())
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  async deleteAuthSession(id: string): Promise<void> {
    await this.db
      .deleteFrom('auth_sessions')
      .where('id', '=', id)
      .execute();
  }

  async deleteAllAuthSessionsForUser(userId: string): Promise<void> {
    await this.db
      .deleteFrom('auth_sessions')
      .where('user_id', '=', userId)
      .execute();
  }

  async saveOAuthAccount(account: OAuthAccount): Promise<void> {
    await this.db
      .insertInto('oauth_accounts')
      .values({
        id: account.id,
        user_id: account.userId,
        provider: account.provider,
        provider_id: account.providerId,
      })
      .onConflict((oc) =>
        oc.columns(['provider', 'provider_id']).doNothing(),
      )
      .execute();
  }

  async findByOAuth(provider: string, providerId: string): Promise<OAuthAccount | null> {
    const row = await this.db
      .selectFrom('oauth_accounts')
      .where('provider', '=', provider)
      .where('provider_id', '=', providerId)
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      providerId: row.provider_id,
      createdAt: row.created_at,
    };
  }

  private toDomain(row: {
    id: string;
    email: string;
    password_hash: string | null;
    role: string;
    status: string;
    created_at: Date;
    updated_at: Date;
  }): User {
    return User.reconstitute({
      id: row.id,
      email: Email.reconstitute(row.email),
      passwordHash: row.password_hash,
      role: UserRole.from(row.role),
      status: UserStatus.from(row.status),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

import {
  User,
  Email,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  UserDisabledError,
  InvalidRefreshTokenError,
  type UserRepository,
  type PasswordHasher,
  type AuthSession,
} from '@flow-app/domain';
import type { TokenService } from '../../infrastructure/token-service.js';
import { randomUUID } from 'node:crypto';

export interface AuthResult {
  user: { id: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OAuthProfile {
  email: string;
  provider: string;
  providerId: string;
}

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(email: string, password: string): Promise<AuthResult> {
    const emailVo = Email.create(email);
    const existing = await this.userRepo.findByEmail(emailVo.toString());
    if (existing) {
      throw new UserAlreadyExistsError(email);
    }

    const passwordHash = await this.hasher.hash(password);
    const user = User.create(emailVo, { passwordHash });
    await this.userRepo.save(user);

    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const emailVo = Email.create(email);
    const user = await this.userRepo.findByEmail(emailVo.toString());
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new UserDisabledError(user.id);
    }

    const valid = await user.verifyPassword(password, this.hasher);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const session = await this.userRepo.findByRefreshToken(refreshToken);
    if (!session) {
      throw new InvalidRefreshTokenError();
    }

    // Rotate: delete old session
    await this.userRepo.deleteAuthSession(session.id);

    const user = await this.userRepo.findById(session.userId);
    if (!user || !user.isActive) {
      throw new InvalidRefreshTokenError();
    }

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.userRepo.findByRefreshToken(refreshToken);
    if (session) {
      await this.userRepo.deleteAuthSession(session.id);
    }
  }

  async loginWithOAuth(profile: OAuthProfile): Promise<AuthResult> {
    // Check if OAuth account already linked
    const existing = await this.userRepo.findByOAuth(profile.provider, profile.providerId);
    if (existing) {
      const user = await this.userRepo.findById(existing.userId);
      if (!user || !user.isActive) {
        throw new UserDisabledError(existing.userId);
      }
      return this.issueTokens(user);
    }

    // Check if user exists by email
    const emailVo = Email.create(profile.email);
    let user = await this.userRepo.findByEmail(emailVo.toString());

    if (!user) {
      // Create new user from OAuth
      user = User.create(emailVo);
      await this.userRepo.save(user);
    }

    // Link OAuth account
    await this.userRepo.saveOAuthAccount({
      id: randomUUID(),
      userId: user.id,
      provider: profile.provider,
      providerId: profile.providerId,
      createdAt: new Date(),
    });

    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = this.tokens.generateAccessToken(user);
    const refreshToken = await this.tokens.generateRefreshToken();
    const expiresAt = this.tokens.refreshTokenExpiry();

    const session: AuthSession = {
      id: randomUUID(),
      userId: user.id,
      refreshToken,
      expiresAt,
      createdAt: new Date(),
    };
    await this.userRepo.saveAuthSession(session);

    return {
      user: {
        id: user.id,
        email: user.email.toString(),
        role: user.role.toString(),
      },
      accessToken,
      refreshToken,
      expiresIn: this.tokens.accessTokenExpirySeconds,
    };
  }
}

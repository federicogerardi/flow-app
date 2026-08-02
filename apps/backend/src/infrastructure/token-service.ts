import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import ms from 'ms';
import type { StringValue } from 'ms';
import type { User } from '@flow-app/domain';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export class TokenService {
  constructor(
    private readonly jwtSecret: string,
    private readonly jwtExpiresIn: string,
    private readonly refreshTokenExpiresInSec: number,
  ) {}

  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email.toString(),
      role: user.role.toString(),
    };
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as StringValue,
      algorithm: 'HS256',
    });
  }

  async generateRefreshToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) reject(err);
        else resolve(buf.toString('hex'));
      });
    });
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      });
      return decoded as TokenPayload;
    } catch {
      return null;
    }
  }

  refreshTokenExpiry(): Date {
    return new Date(Date.now() + this.refreshTokenExpiresInSec * 1000);
  }

  get accessTokenExpirySeconds(): number {
    return ms(this.jwtExpiresIn as StringValue) / 1000;
  }
}

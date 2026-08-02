import { randomUUID } from 'node:crypto';
import type { Email } from './value-objects/Email';
import { UserRole } from './value-objects/UserRole';
import { UserStatus } from './value-objects/UserStatus';

export interface PasswordHasher {
  hash(plainText: string): Promise<string>;
  verify(plainText: string, hash: string): Promise<boolean>;
}

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    private _passwordHash: string | null,
    public readonly role: UserRole,
    private _status: UserStatus,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static register(email: Email, passwordHash: string): User {
    const now = new Date();
    return new User(randomUUID(), email, passwordHash, UserRole.Member, UserStatus.Active, now, now);
  }

  static fromOAuth(email: Email): User {
    const now = new Date();
    return new User(randomUUID(), email, null, UserRole.Member, UserStatus.Active, now, now);
  }

  static reconstitute(props: UserProps): User {
    return new User(
      props.id,
      props.email,
      props.passwordHash,
      props.role,
      props.status,
      props.createdAt,
      props.updatedAt,
    );
  }

  async verifyPassword(plainText: string, hasher: PasswordHasher): Promise<boolean> {
    if (!this._passwordHash) return false;
    return hasher.verify(plainText, this._passwordHash);
  }

  disable(): void {
    this._status = UserStatus.Disabled;
    this._updatedAt = new Date();
  }

  enable(): void {
    this._status = UserStatus.Active;
    this._updatedAt = new Date();
  }

  get passwordHash(): string | null {
    return this._passwordHash;
  }

  get isActive(): boolean {
    return this._status.isActive;
  }

  get status(): UserStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}

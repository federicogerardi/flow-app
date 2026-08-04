import { Identifier } from '../../shared/identifier';
import { randomUUID } from '../../shared/random-uuid';

export class SessionId extends Identifier<string> {
  private constructor(value: string) {
    super(value);
  }

  static generate(): SessionId {
    return new SessionId(randomUUID());
  }

  static from(value: string): SessionId {
    return new SessionId(value);
  }
}

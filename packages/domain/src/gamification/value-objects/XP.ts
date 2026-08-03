import { InvalidXPValueError } from '../errors';

export class XP {
  private constructor(private readonly _amount: number) {}

  static of(amount: number): XP {
    if (amount < 0 || !Number.isInteger(amount)) {
      throw new InvalidXPValueError(amount);
    }
    return new XP(amount);
  }

  static zero(): XP {
    return new XP(0);
  }

  static reconstitute(amount: number): XP {
    return new XP(amount);
  }

  add(other: XP): XP {
    return new XP(this._amount + other._amount);
  }

  equals(other: XP): boolean {
    return this._amount === other._amount;
  }

  get value(): number {
    return this._amount;
  }
}

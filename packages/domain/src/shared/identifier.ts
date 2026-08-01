export abstract class Identifier<T> {
  constructor(readonly value: T) {}

  equals(other: Identifier<T>): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}

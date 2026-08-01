export class StepNumber {
  private constructor(readonly value: number) {
    if (value < 1) {
      throw new Error('StepNumber must be >= 1');
    }
  }

  static of(value: number): StepNumber {
    return new StepNumber(value);
  }

  equals(other: StepNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}

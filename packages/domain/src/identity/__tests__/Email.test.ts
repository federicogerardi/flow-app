import { describe, it, expect } from 'vitest';
import { Email, InvalidEmailError } from '../value-objects/Email';

describe('Email', () => {
  it('create() normalizes to lowercase', () => {
    const email = Email.create('User@Example.COM');
    expect(email.value).toBe('user@example.com');
  });

  it('create() trims whitespace', () => {
    const email = Email.create('  user@example.com  ');
    expect(email.value).toBe('user@example.com');
  });

  it('create() throws InvalidEmailError for missing @', () => {
    expect(() => Email.create('userexample.com')).toThrow(InvalidEmailError);
  });

  it('create() throws InvalidEmailError for empty string', () => {
    expect(() => Email.create('')).toThrow(InvalidEmailError);
  });

  it('create() throws InvalidEmailError for whitespace-only string', () => {
    expect(() => Email.create('   ')).toThrow(InvalidEmailError);
  });

  it('create() enforces max length of 255', () => {
    const longLocal = 'a'.repeat(246);
    expect(() => Email.create(`${longLocal}@example.com`)).toThrow(InvalidEmailError);
  });

  it('equals() returns true for same email', () => {
    const a = Email.create('user@example.com');
    const b = Email.create('USER@EXAMPLE.COM');
    expect(a.equals(b)).toBe(true);
  });

  it('equals() returns false for different emails', () => {
    const a = Email.create('a@example.com');
    const b = Email.create('b@example.com');
    expect(a.equals(b)).toBe(false);
  });

  it('toString() returns the normalized value', () => {
    const email = Email.create('User@Example.COM');
    expect(email.toString()).toBe('user@example.com');
  });

  it('reconstitute() creates email without validation', () => {
    const email = Email.reconstitute('test@example.com');
    expect(email.value).toBe('test@example.com');
  });
});

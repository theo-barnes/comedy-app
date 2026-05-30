import {
  createSignInSchema,
  createSignUpSchema,
  createForgotSchema,
} from '@/features/auth/schemas';
import type { TFunction } from 'i18next';

// Returns the i18n key as-is so error messages are testable without loading translations.
const t = ((key: string) => key) as unknown as TFunction;

describe('createSignInSchema', () => {
  const schema = createSignInSchema(t);

  it('passes with valid email and password', () => {
    const result = schema.safeParse({ email: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('fails when email is missing', () => {
    const result = schema.safeParse({ email: '', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('fails when email is malformed', () => {
    const result = schema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('fails when password is empty', () => {
    const result = schema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('createSignUpSchema', () => {
  const schema = createSignUpSchema(t);

  const valid = {
    displayName: 'Alice',
    email: 'alice@example.com',
    password: 'abc12345',
  };

  it('passes with valid displayName, email and password', () => {
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('fails when displayName is empty', () => {
    const result = schema.safeParse({ ...valid, displayName: '' });
    expect(result.success).toBe(false);
  });

  it('fails when password is shorter than 8 characters', () => {
    const result = schema.safeParse({ ...valid, password: 'abc123' });
    expect(result.success).toBe(false);
  });

  it('fails when password is longer than 128 characters', () => {
    const result = schema.safeParse({ ...valid, password: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });

  it('fails when password contains only numeric characters', () => {
    const result = schema.safeParse({ ...valid, password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('passes when password contains at least one non-numeric character', () => {
    const result = schema.safeParse({ ...valid, password: '1234567a' });
    expect(result.success).toBe(true);
  });

  it('fails when email is malformed', () => {
    const result = schema.safeParse({ ...valid, email: 'bad-email' });
    expect(result.success).toBe(false);
  });
});

describe('createForgotSchema', () => {
  const schema = createForgotSchema(t);

  it('passes with a valid email', () => {
    const result = schema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('fails with a malformed email', () => {
    const result = schema.safeParse({ email: 'not-valid' });
    expect(result.success).toBe(false);
  });

  it('fails with an empty string', () => {
    const result = schema.safeParse({ email: '' });
    expect(result.success).toBe(false);
  });
});

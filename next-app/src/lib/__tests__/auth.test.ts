import { validatePassword, validateEmail } from '@/lib/auth';

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const { valid, errors } = validatePassword('Ab1!');
    expect(valid).toBe(false);
    expect(errors).toContain('at least 8 characters');
  });

  it('rejects passwords without uppercase', () => {
    const { valid, errors } = validatePassword('abcdef1!');
    expect(valid).toBe(false);
    expect(errors).toContain('at least one uppercase letter');
  });

  it('rejects passwords without lowercase', () => {
    const { valid, errors } = validatePassword('ABCDEF1!');
    expect(valid).toBe(false);
    expect(errors).toContain('at least one lowercase letter');
  });

  it('rejects passwords without a number', () => {
    const { valid, errors } = validatePassword('Abcdefg!');
    expect(valid).toBe(false);
    expect(errors).toContain('at least one number');
  });

  it('rejects passwords without a special character', () => {
    const { valid, errors } = validatePassword('Abcdefg1');
    expect(valid).toBe(false);
    expect(errors).toContain('at least one special character');
  });

  it('returns all errors at once for a very weak password', () => {
    const { valid, errors } = validatePassword('abc');
    expect(valid).toBe(false);
    expect(errors).toHaveLength(4);
  });

  it('accepts a valid strong password', () => {
    const { valid, errors } = validatePassword('Str0ng!Pass');
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });
});

describe('validateEmail', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});
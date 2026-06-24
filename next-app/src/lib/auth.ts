import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface AuthPayload {
  userId: string;
}

export function requireAuth(req: NextRequest): AuthPayload {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    return payload;
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}
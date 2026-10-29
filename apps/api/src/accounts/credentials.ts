import { BadRequestException } from '@nestjs/common';

export interface Credentials {
  email: string;
  password: string;
}

/** Checks a register/login request body. Returns the email trimmed and lower-cased. */
export function parseCredentials(body: unknown): Credentials {
  const { email, password } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    password.length < 12 ||
    password.length > 128
  )
    throw new BadRequestException(
      'Use a valid email and a password of 12–128 characters.',
    );
  return { email: normalizeEmail(email), password };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** 256 bits from the platform CSPRNG, URL-safe so it survives an e-mail client. */
export const newToken = (): string => randomBytes(32).toString('base64url');

/** What goes in the database. The token itself is never stored anywhere. */
export const hashToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

/**
 * The lookup is by digest, so the secret is never the thing being compared.
 * This keeps that property honest if a query ever changes — both operands are
 * a SHA-256 in hex, so the lengths always match.
 */
export const sameDigest = (a: string, b: string): boolean =>
  a.length === b.length && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

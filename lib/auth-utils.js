import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

export const SESSION_COOKIE_NAME = 'bloom_session';
export const PASSWORD_HASH_PREFIX = 'scrypt';
export const SCRYPT_KEY_LENGTH = 64;
export const SCRYPT_COST = 16384;
export const SCRYPT_BLOCK_SIZE = 8;
export const SCRYPT_PARALLELIZATION = 1;
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function createJsonResponse(response, statusCode, payload, extraHeaders) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  };

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      response.setHeader(key, value);
    }
  });

  response.status(statusCode).send(JSON.stringify(payload));
}

export function readRequestBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    return JSON.parse(body);
  }

  return body;
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function getSessionTtlSeconds() {
  const rawValue = Number(process.env.AUTH_SESSION_TTL_SECONDS || DEFAULT_SESSION_TTL_SECONDS);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }

  return Math.floor(rawValue);
}

export function getSessionExpiresAt(ttlSeconds) {
  return new Date(Date.now() + ttlSeconds * 1000);
}

export function getSessionSecret() {
  return String(process.env.AUTH_SESSION_SECRET || '');
}

export function hashSessionToken(token, secret) {
  return crypto.createHmac('sha256', secret).update(String(token || '')).digest('hex');
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(String(password || ''), salt, SCRYPT_KEY_LENGTH, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
  });

  return [
    PASSWORD_HASH_PREFIX,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt,
    Buffer.from(derivedKey).toString('hex'),
  ].join('$');
}

export async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 6 || parts[0] !== PASSWORD_HASH_PREFIX) {
    return false;
  }

  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  const salt = parts[4];
  const expectedHash = parts[5];

  if (!cost || !blockSize || !parallelization || !salt || !expectedHash) {
    return false;
  }

  const derivedKey = await scryptAsync(String(password || ''), salt, Buffer.from(expectedHash, 'hex').length, {
    cost,
    blockSize,
    parallelization,
  });

  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(derivedKey);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function parseCookies(cookieHeader) {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      accumulator[key] = value;
      return accumulator;
    }, {});
}

export function getSessionTokenFromRequest(request) {
  const cookies = parseCookies(request.headers.cookie || '');
  return cookies[SESSION_COOKIE_NAME] || '';
}

export function isSecureRequest(request) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').toLowerCase();
  return forwardedProto === 'https';
}

export function serializeSessionCookie(token, expiresAt, request) {
  const secureAttribute = isSecureRequest(request) ? '; Secure' : '';
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    `Expires=${expiresAt.toUTCString()}`,
    secureAttribute,
  ]
    .filter(Boolean)
    .join('; ');
}

export function serializeExpiredSessionCookie(request) {
  const secureAttribute = isSecureRequest(request) ? '; Secure' : '';
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    secureAttribute,
  ]
    .filter(Boolean)
    .join('; ');
}

export function buildUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name || normalizeEmail(user.email).split('@')[0] || 'Bloom User',
  };
}

export function getRequestMetadata(request) {
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ipAddress = forwardedFor || String(request.socket?.remoteAddress || '').trim();
  const userAgent = String(request.headers['user-agent'] || '').trim();

  return {
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  };
}

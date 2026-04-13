import {
  encodeFilterValue,
  isSupabaseConfigured,
  requestSupabase,
} from './supabase-rest.js';

export function isAuthStoreConfigured() {
  return Boolean(isSupabaseConfigured() && process.env.AUTH_SESSION_SECRET);
}

export async function fetchUserByEmail(email) {
  const result = await requestSupabase(
    `/app_users?select=id,email,display_name,password_hash,status&email=eq.${encodeFilterValue(email)}&limit=1`,
    { method: 'GET' }
  );

  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function fetchUserById(id) {
  const result = await requestSupabase(
    `/app_users?select=id,email,display_name,status&id=eq.${encodeFilterValue(id)}&limit=1`,
    { method: 'GET' }
  );

  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function updateUserLastLogin(userId) {
  await requestSupabase(`/app_users?id=eq.${encodeFilterValue(userId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: {
      last_login_at: new Date().toISOString(),
    },
  });
}

export async function createSessionRecord(session) {
  const result = await requestSupabase('/auth_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: session,
  });

  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function fetchSessionByTokenHash(sessionTokenHash) {
  const result = await requestSupabase(
    `/auth_sessions?select=id,user_id,expires_at,revoked_at&session_token_hash=eq.${encodeFilterValue(sessionTokenHash)}&limit=1`,
    { method: 'GET' }
  );

  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function updateSessionLastAccess(sessionId) {
  await requestSupabase(`/auth_sessions?id=eq.${encodeFilterValue(sessionId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: {
      last_accessed_at: new Date().toISOString(),
    },
  });
}

export async function revokeSessionByTokenHash(sessionTokenHash) {
  await requestSupabase(`/auth_sessions?session_token_hash=eq.${encodeFilterValue(sessionTokenHash)}&revoked_at=is.null`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: {
      revoked_at: new Date().toISOString(),
    },
  });
}

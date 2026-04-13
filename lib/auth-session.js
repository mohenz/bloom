import {
  getSessionSecret,
  getSessionTokenFromRequest,
  hashSessionToken,
} from './auth-utils.js';
import {
  fetchSessionByTokenHash,
  fetchUserById,
  isAuthStoreConfigured,
  revokeSessionByTokenHash,
  updateSessionLastAccess,
} from './auth-store.js';

function isSessionExpired(session) {
  return new Date(session.expires_at).getTime() <= Date.now();
}

export async function getAuthenticatedSession(request, options) {
  const nextOptions = {
    touchSession: true,
    ...options,
  };

  if (!isAuthStoreConfigured()) {
    return {
      configured: false,
      authenticated: false,
      message: '인증 서버 설정이 아직 완료되지 않았습니다.',
      shouldClearCookie: false,
    };
  }

  const sessionToken = getSessionTokenFromRequest(request);
  if (!sessionToken) {
    return {
      configured: true,
      authenticated: false,
      shouldClearCookie: false,
    };
  }

  const sessionTokenHash = hashSessionToken(sessionToken, getSessionSecret());
  const session = await fetchSessionByTokenHash(sessionTokenHash);

  if (!session || session.revoked_at || isSessionExpired(session)) {
    if (session && !session.revoked_at) {
      await revokeSessionByTokenHash(sessionTokenHash);
    }

    return {
      configured: true,
      authenticated: false,
      shouldClearCookie: true,
    };
  }

  const user = await fetchUserById(session.user_id);
  if (!user || user.status !== 'active') {
    await revokeSessionByTokenHash(sessionTokenHash);
    return {
      configured: true,
      authenticated: false,
      shouldClearCookie: true,
    };
  }

  if (nextOptions.touchSession) {
    await updateSessionLastAccess(session.id);
  }

  return {
    configured: true,
    authenticated: true,
    user,
    session,
    sessionTokenHash,
    shouldClearCookie: false,
  };
}

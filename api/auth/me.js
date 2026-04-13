import {
  buildUserPayload,
  createJsonResponse,
  getSessionSecret,
  getSessionTokenFromRequest,
  hashSessionToken,
  serializeExpiredSessionCookie,
} from '../../lib/auth-utils.js';
import {
  fetchSessionByTokenHash,
  fetchUserById,
  isAuthStoreConfigured,
  revokeSessionByTokenHash,
  updateSessionLastAccess,
} from '../../lib/auth-store.js';

function isSessionExpired(session) {
  return new Date(session.expires_at).getTime() <= Date.now();
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    createJsonResponse(response, 405, { message: 'Method Not Allowed' });
    return;
  }

  if (!isAuthStoreConfigured()) {
    createJsonResponse(response, 200, {
      configured: false,
      authenticated: false,
      message: '인증 서버 설정이 아직 완료되지 않았습니다.',
    });
    return;
  }

  const sessionToken = getSessionTokenFromRequest(request);
  if (!sessionToken) {
    createJsonResponse(response, 200, {
      configured: true,
      authenticated: false,
    });
    return;
  }

  try {
    const sessionTokenHash = hashSessionToken(sessionToken, getSessionSecret());
    const session = await fetchSessionByTokenHash(sessionTokenHash);

    if (!session || session.revoked_at || isSessionExpired(session)) {
      if (session && !session.revoked_at) {
        await revokeSessionByTokenHash(sessionTokenHash);
      }

      createJsonResponse(
        response,
        200,
        {
          configured: true,
          authenticated: false,
        },
        {
          'Set-Cookie': serializeExpiredSessionCookie(request),
        }
      );
      return;
    }

    const user = await fetchUserById(session.user_id);
    if (!user || user.status !== 'active') {
      await revokeSessionByTokenHash(sessionTokenHash);
      createJsonResponse(
        response,
        200,
        {
          configured: true,
          authenticated: false,
        },
        {
          'Set-Cookie': serializeExpiredSessionCookie(request),
        }
      );
      return;
    }

    await updateSessionLastAccess(session.id);

    createJsonResponse(response, 200, {
      configured: true,
      authenticated: true,
      user: buildUserPayload(user),
    });
  } catch (error) {
    createJsonResponse(response, 500, {
      configured: true,
      authenticated: false,
      message: error instanceof Error ? error.message : '세션 확인 중 오류가 발생했습니다.',
    });
  }
}

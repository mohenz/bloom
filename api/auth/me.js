import {
  buildUserPayload,
  createJsonResponse,
  serializeExpiredSessionCookie,
} from '../../lib/auth-utils.js';
import { getAuthenticatedSession } from '../../lib/auth-session.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    createJsonResponse(response, 405, { message: 'Method Not Allowed' });
    return;
  }

  try {
    const authState = await getAuthenticatedSession(request);

    if (!authState.configured) {
      createJsonResponse(response, 200, {
        configured: false,
        authenticated: false,
        message: authState.message || '인증 서버 설정이 아직 완료되지 않았습니다.',
      });
      return;
    }

    if (!authState.authenticated) {
      createJsonResponse(
        response,
        200,
        {
          configured: true,
          authenticated: false,
        },
        authState.shouldClearCookie
          ? {
              'Set-Cookie': serializeExpiredSessionCookie(request),
            }
          : undefined
      );
      return;
    }

    createJsonResponse(response, 200, {
      configured: true,
      authenticated: true,
      user: buildUserPayload(authState.user),
    });
  } catch (error) {
    createJsonResponse(response, 500, {
      configured: true,
      authenticated: false,
      message: error instanceof Error ? error.message : '세션 확인 중 오류가 발생했습니다.',
    });
  }
}

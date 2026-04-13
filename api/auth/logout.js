import {
  createJsonResponse,
  getSessionSecret,
  getSessionTokenFromRequest,
  hashSessionToken,
  serializeExpiredSessionCookie,
} from '../../lib/auth-utils.js';
import { isAuthStoreConfigured, revokeSessionByTokenHash } from '../../lib/auth-store.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    createJsonResponse(response, 405, { message: 'Method Not Allowed' });
    return;
  }

  const sessionToken = getSessionTokenFromRequest(request);

  try {
    if (isAuthStoreConfigured() && sessionToken) {
      const sessionTokenHash = hashSessionToken(sessionToken, getSessionSecret());
      await revokeSessionByTokenHash(sessionTokenHash);
    }
  } catch (error) {
    // Clear cookie regardless of revoke result.
  }

  createJsonResponse(
    response,
    200,
    {
      ok: true,
    },
    {
      'Set-Cookie': serializeExpiredSessionCookie(request),
    }
  );
}

import {
  createJsonResponse,
  getSessionSecret,
  getSessionTokenFromRequest,
  hashSessionToken,
  serializeExpiredSessionCookie,
} from '../../lib/auth-utils.js';
import { isAuthStoreConfigured, revokeSessionByTokenHash } from '../../lib/auth-store.js';

export default async function handler(request, response) {
  // CORS Headers for cross-origin integration
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

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












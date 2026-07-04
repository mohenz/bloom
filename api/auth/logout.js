import { auth } from '../../lib/firebase-store.js';
import {
  createJsonResponse,
  getSessionTokenFromRequest,
  serializeExpiredSessionCookie,
} from '../../lib/auth-utils.js';

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

  const sessionCookie = getSessionTokenFromRequest(request);

  try {
    if (sessionCookie) {
      const decodedClaims = await auth.verifySessionCookie(sessionCookie);
      // Revoke all refresh tokens and sessions for the user
      await auth.revokeRefreshTokens(decodedClaims.uid);
    }
  } catch (error) {
    // Proceed to clear cookie even if token verification or revocation fails
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













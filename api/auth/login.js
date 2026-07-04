import { auth, db } from '../../lib/firebase-store.js';
import { FieldValue } from 'firebase-admin/firestore';
import {
  buildUserPayload,
  createJsonResponse,
  getRequestMetadata,
  getSessionExpiresAt,
  getSessionTtlSeconds,
  normalizeEmail,
  readRequestBody,
  serializeSessionCookie,
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

  try {
    const body = readRequestBody(request.body);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!email || !password) {
      createJsonResponse(response, 400, { message: '이메일과 비밀번호를 모두 입력하세요.' });
      return;
    }

    // Authenticate with Firebase Auth REST API (compatible with Auth emulator)
    const apiKey = process.env.FIREBASE_API_KEY || 'fake-api-key';
    const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const authUrl = emulatorHost
      ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`
      : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
      const errMsg = authData.error?.message || '이메일 또는 비밀번호가 올바르지 않습니다.';
      createJsonResponse(response, 401, { message: errMsg });
      return;
    }

    const { idToken, localId, displayName } = authData;

    // Create Firebase Session Cookie
    const ttlSeconds = getSessionTtlSeconds();
    const expiresIn = ttlSeconds * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    const expiresAt = getSessionExpiresAt(ttlSeconds);

    // Write or update user profile in Firestore
    const userRef = db.collection('users').doc(localId);
    const finalDisplayName = displayName || email.split('@')[0];
    
    await userRef.set({
      email,
      displayName: finalDisplayName,
      lastLoginAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Build user payload for frontend
    const userPayload = {
      id: localId,
      email,
      display_name: finalDisplayName,
    };

    createJsonResponse(
      response,
      200,
      {
        user: buildUserPayload(userPayload),
      },
      {
        'Set-Cookie': serializeSessionCookie(sessionCookie, expiresAt, request),
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    createJsonResponse(response, 500, {
      message: error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.',
    });
  }
}













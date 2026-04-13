import {
  buildUserPayload,
  createJsonResponse,
  createSessionToken,
  getRequestMetadata,
  getSessionExpiresAt,
  getSessionSecret,
  getSessionTtlSeconds,
  hashSessionToken,
  normalizeEmail,
  readRequestBody,
  serializeSessionCookie,
  verifyPassword,
} from '../../lib/auth-utils.js';
import {
  createSessionRecord,
  fetchUserByEmail,
  isAuthStoreConfigured,
  updateUserLastLogin,
} from '../../lib/auth-store.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    createJsonResponse(response, 405, { message: 'Method Not Allowed' });
    return;
  }

  if (!isAuthStoreConfigured()) {
    createJsonResponse(response, 503, {
      configured: false,
      message: '인증 서버 설정이 아직 완료되지 않았습니다.',
    });
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

    const user = await fetchUserByEmail(email);
    if (!user || user.status !== 'active') {
      createJsonResponse(response, 401, { message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const verified = await verifyPassword(password, user.password_hash);
    if (!verified) {
      createJsonResponse(response, 401, { message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const ttlSeconds = getSessionTtlSeconds();
    const sessionToken = createSessionToken();
    const expiresAt = getSessionExpiresAt(ttlSeconds);
    const sessionTokenHash = hashSessionToken(sessionToken, getSessionSecret());
    const metadata = getRequestMetadata(request);

    await createSessionRecord({
      user_id: user.id,
      session_token_hash: sessionTokenHash,
      expires_at: expiresAt.toISOString(),
      user_agent: metadata.userAgent,
      ip_address: metadata.ipAddress,
    });
    await updateUserLastLogin(user.id);

    createJsonResponse(
      response,
      200,
      {
        user: buildUserPayload(user),
      },
      {
        'Set-Cookie': serializeSessionCookie(sessionToken, expiresAt, request),
      }
    );
  } catch (error) {
    createJsonResponse(response, 500, {
      message: error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.',
    });
  }
}

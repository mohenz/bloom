import {
  createJsonResponse,
  hashPassword,
  normalizeEmail,
  readRequestBody,
} from '../../lib/auth-utils.js';
import {
  fetchUserByEmail,
  isAuthStoreConfigured,
  updateUserPassword,
  revokeAllSessionsForUser,
} from '../../lib/auth-store.js';

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

  if (!isAuthStoreConfigured()) {
    createJsonResponse(response, 503, {
      configured: false,
      message: '인증 서버 설정이 아직 완료되지 않았습니다.',
    });
    return;
  }

  const resetMasterKey = process.env.PASSWORD_RESET_MASTER_KEY;
  if (!resetMasterKey || resetMasterKey.trim() === '') {
    createJsonResponse(response, 503, {
      message: '서버에 마스터 시큐리티 키가 구성되지 않아 비밀번호 초기화 기능을 사용할 수 없습니다.',
    });
    return;
  }

  try {
    const body = readRequestBody(request.body);
    const email = normalizeEmail(body.email);
    const masterKey = String(body.masterKey || '');
    const password = String(body.password || '');

    if (!email || !masterKey || !password) {
      createJsonResponse(response, 400, {
        message: '이메일, 마스터 시큐리티 키, 새 비밀번호를 모두 입력하세요.',
      });
      return;
    }

    if (masterKey !== resetMasterKey) {
      createJsonResponse(response, 401, {
        message: '마스터 시큐리티 키가 일치하지 않습니다.',
      });
      return;
    }

    const user = await fetchUserByEmail(email);
    if (!user || user.status !== 'active') {
      createJsonResponse(response, 404, {
        message: '가입되지 않았거나 비활성화된 이메일 계정입니다.',
      });
      return;
    }

    // Hash the new password and update
    const newPasswordHash = await hashPassword(password);
    await updateUserPassword(user.id, newPasswordHash);

    // Revoke all sessions to force logout
    await revokeAllSessionsForUser(user.id);

    createJsonResponse(response, 200, {
      message: '비밀번호가 성공적으로 재설정되었습니다. 새로운 비밀번호로 로그인하세요.',
    });
  } catch (error) {
    createJsonResponse(response, 500, {
      message: error instanceof Error ? error.message : '비밀번호 재설정 처리 중 오류가 발생했습니다.',
    });
  }
}

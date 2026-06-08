import {
  AUTH_ENDPOINTS,
  HOSTED_APP_URL,
  canUseAuthApi,
  isGitHubPagesPreview,
  requestAuth,
  showToast
} from './common.js';

const DEFAULT_LOGIN_ERROR_MESSAGE = '이메일 또는 비밀번호가 올바르지 않습니다.';

const dom = {};
let authEnabled = false;

function cacheDom() {
  dom.loginForm = document.getElementById('loginForm');
  dom.emailInput = document.getElementById('emailInput');
  dom.passwordInput = document.getElementById('passwordInput');
  dom.loginHelp = document.getElementById('loginHelp');
  dom.loginError = document.getElementById('loginError');
  dom.loginSubmitBtn = document.getElementById('loginSubmitBtn');
  dom.loginAltActions = document.getElementById('loginAltActions');
  dom.openHostedAppBtn = document.getElementById('openHostedAppBtn');
  dom.guestPreviewBtn = document.getElementById('guestPreviewBtn');

  // Password reset elements
  dom.openResetModalBtn = document.getElementById('openResetModalBtn');
  dom.resetPasswordModal = document.getElementById('resetPasswordModal');
  dom.closeResetModalBtn = document.getElementById('closeResetModalBtn');
  dom.resetPasswordForm = document.getElementById('resetPasswordForm');
  dom.resetEmailInput = document.getElementById('resetEmailInput');
  dom.resetMasterKeyInput = document.getElementById('resetMasterKeyInput');
  dom.resetPasswordInput = document.getElementById('resetPasswordInput');
  dom.resetPasswordConfirmInput = document.getElementById('resetPasswordConfirmInput');
  dom.resetError = document.getElementById('resetError');
  dom.resetSubmitBtn = document.getElementById('resetSubmitBtn');
}

function setLoginFormDisabled(disabled) {
  dom.emailInput.disabled = disabled;
  dom.passwordInput.disabled = disabled;
  dom.loginSubmitBtn.disabled = disabled;
}

function setLoginSubmitState(isLoading, label) {
  dom.loginSubmitBtn.disabled = isLoading || !authEnabled;
  dom.loginSubmitBtn.textContent = isLoading ? (label || '처리 중...') : '로그인';
}

function showLoginError(message) {
  dom.loginError.textContent = message || DEFAULT_LOGIN_ERROR_MESSAGE;
  dom.loginError.classList.remove('is-hidden');
}

function hideLoginError() {
  dom.loginError.textContent = DEFAULT_LOGIN_ERROR_MESSAGE;
  dom.loginError.classList.add('is-hidden');
}

function showLoginAlternatives(visible) {
  dom.loginAltActions.classList.toggle('is-hidden', !visible);
}

function configureGitHubPagesPreview() {
  authEnabled = false;
  setLoginFormDisabled(true);
  dom.loginSubmitBtn.disabled = true;
  dom.loginSubmitBtn.textContent = 'GitHub Pages 미지원';
  dom.loginHelp.textContent = 'GitHub Pages 미리보기에서는 로그인과 저장 기능을 사용할 수 없습니다. 정식 앱으로 이동하거나 게스트로 둘러보세요.';
  showLoginAlternatives(true);
}

function openHostedApp() {
  window.location.href = HOSTED_APP_URL;
}

function enterGuestPreview() {
  hideLoginError();
  sessionStorage.setItem('bloom_guest_session', 'true');
  dom.loginForm.reset();
  window.location.href = './index.html';
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  hideLoginError();

  if (!authEnabled) {
    showLoginError('로그인 설정이 아직 완료되지 않았습니다.');
    return;
  }

  const email = dom.emailInput.value.trim().toLowerCase();
  const password = dom.passwordInput.value;

  if (!email || !password) {
    showLoginError('이메일과 비밀번호를 모두 입력하세요.');
    return;
  }

  setLoginSubmitState(true, '로그인 중...');

  try {
    const result = await requestAuth(AUTH_ENDPOINTS.login, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });

    const payload = result.payload || {};
    if (!result.ok || !payload.user) {
      showLoginError(payload.message || DEFAULT_LOGIN_ERROR_MESSAGE);
      return;
    }

    sessionStorage.removeItem('bloom_guest_session'); // Clear guest mode
    dom.loginForm.reset();
    window.location.href = './index.html';
  } catch (error) {
    showLoginError('로그인 서버에 연결하지 못했습니다.');
  } finally {
    setLoginSubmitState(false);
  }
}

// Password reset modal controls
function openResetModal() {
  if (!authEnabled) {
    showToast('게스트 모드/로컬 환경에서는 비밀번호를 재설정할 수 없습니다.');
    return;
  }
  hideResetError();
  dom.resetPasswordForm.reset();
  dom.resetPasswordModal.classList.remove('is-hidden');
}

function closeResetModal() {
  dom.resetPasswordModal.classList.add('is-hidden');
  dom.resetPasswordForm.reset();
}

function showResetError(message) {
  dom.resetError.textContent = message;
  dom.resetError.classList.remove('is-hidden');
}

function hideResetError() {
  dom.resetError.textContent = '';
  dom.resetError.classList.add('is-hidden');
}

async function handleResetPasswordSubmit(event) {
  event.preventDefault();
  hideResetError();

  const email = dom.resetEmailInput.value.trim().toLowerCase();
  const masterKey = dom.resetMasterKeyInput.value;
  const password = dom.resetPasswordInput.value;
  const passwordConfirm = dom.resetPasswordConfirmInput.value;

  if (!email || !masterKey || !password || !passwordConfirm) {
    showResetError('모든 정보를 입력해주세요.');
    return;
  }

  if (password !== passwordConfirm) {
    showResetError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
    return;
  }

  dom.resetSubmitBtn.disabled = true;
  const originalText = dom.resetSubmitBtn.textContent;
  dom.resetSubmitBtn.textContent = '재설정 처리 중...';

  try {
    const result = await requestAuth('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({ email, masterKey, password }),
    });

    const payload = result.payload || {};
    if (!result.ok) {
      showResetError(payload.message || '비밀번호 재설정에 실패했습니다.');
      return;
    }

    showToast('비밀번호가 성공적으로 재설정되었습니다.');
    closeResetModal();
  } catch (error) {
    showResetError('비밀번호 재설정 서버에 연결하지 못했습니다.');
  } finally {
    dom.resetSubmitBtn.disabled = false;
    dom.resetSubmitBtn.textContent = originalText;
  }
}

async function initializeAuth() {
  dom.loginHelp.textContent = '로그인 상태를 확인하는 중입니다.';
  setLoginFormDisabled(true);
  setLoginSubmitState(true, '준비 중...');
  showLoginAlternatives(false);

  if (isGitHubPagesPreview()) {
    configureGitHubPagesPreview();
    return;
  }

  if (!canUseAuthApi()) {
    authEnabled = false;
    dom.loginHelp.textContent = '로컬 파일 환경입니다. 게스트로 둘러보기를 이용해 디자인을 확인하실 수 있습니다.';
    setLoginSubmitState(false);
    showLoginAlternatives(true);
    return;
  }

  try {
    const result = await requestAuth(AUTH_ENDPOINTS.me, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });

    if (!result.ok) {
      if (isGitHubPagesPreview()) {
        configureGitHubPagesPreview();
        return;
      }

      authEnabled = false;
      dom.loginHelp.textContent = '로그인 API를 찾지 못했습니다. 게스트로 둘러보기를 이용해 디자인을 확인하실 수 있습니다.';
      setLoginSubmitState(false);
      showLoginAlternatives(true);
      return;
    }

    const payload = result.payload || {};
    authEnabled = payload.configured !== false;

    if (!authEnabled) {
      dom.loginHelp.textContent = payload.message || '로그인 서버 설정이 아직 완료되지 않았습니다.';
      setLoginSubmitState(false);
      return;
    }

    dom.loginHelp.textContent = '이메일과 비밀번호로 로그인합니다.';
    setLoginFormDisabled(false);
    setLoginSubmitState(false);
    showLoginAlternatives(false);

    if (payload.authenticated && payload.user) {
      // 로그아웃 직후 진입한 경우(쿠키가 아직 살아있을 수 있음) 자동 리다이렉트 차단
      const isJustLoggedOut = new URLSearchParams(window.location.search).get('logout') === '1';
      if (!isJustLoggedOut) {
        window.location.href = './index.html';
      } else {
        // 로그아웃 플래그가 있으면 URL을 깔끔하게 정리하고 로그인 폼 표시 유지
        history.replaceState(null, '', './login.html');
      }
    }
  } catch (error) {
    if (isGitHubPagesPreview()) {
      configureGitHubPagesPreview();
      return;
    }

    authEnabled = false;
    dom.loginHelp.textContent = '로그인 서버와 연결하지 못했습니다. 게스트로 둘러보기를 이용해 디자인을 확인하실 수 있습니다.';
    setLoginSubmitState(false);
    showLoginAlternatives(true);
  }
}

function bindEvents() {
  dom.loginForm.addEventListener('submit', handleLoginSubmit);
  dom.openHostedAppBtn.addEventListener('click', openHostedApp);
  dom.guestPreviewBtn.addEventListener('click', enterGuestPreview);
  dom.emailInput.addEventListener('input', hideLoginError);
  dom.passwordInput.addEventListener('input', hideLoginError);

  // Password reset event bindings
  if (dom.openResetModalBtn) {
    dom.openResetModalBtn.addEventListener('click', openResetModal);
  }
  if (dom.closeResetModalBtn) {
    dom.closeResetModalBtn.addEventListener('click', closeResetModal);
  }
  if (dom.resetPasswordForm) {
    dom.resetPasswordForm.addEventListener('submit', handleResetPasswordSubmit);
  }
}

function init() {
  cacheDom();
  bindEvents();
  initializeAuth();
}

document.addEventListener('DOMContentLoaded', init);

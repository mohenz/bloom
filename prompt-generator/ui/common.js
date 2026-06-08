// Bloom Universe Common Module (ES Module)
export const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
};

export const HOSTED_APP_URL = 'https://bloom-rouge-zeta.vercel.app/';

export function buildFallbackName(email) {
  if (!email) return 'Bloom User';
  return email.split('@')[0] || 'Bloom User';
}

export function canUseAuthApi() {
  return window.location && /^https?:$/i.test(window.location.protocol);
}

export function isGitHubPagesPreview() {
  return window.location && /\.github\.io$/i.test(window.location.hostname || '');
}

export async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

export async function requestAuth(url, options) {
  const response = await window.fetch(url, options);
  const payload = await readJsonResponse(response);
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

export function showToast(message) {
  let toast = document.getElementById('copyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copyToast';
    toast.className = 'copy-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = '✓ ' + message;
  toast.classList.add('show');
  window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

export async function handleLogout() {
  const isGuest = sessionStorage.getItem('bloom_guest_session') === 'true';
  sessionStorage.removeItem('bloom_guest_session');

  try {
    if (canUseAuthApi() && !isGuest) {
      await requestAuth(AUTH_ENDPOINTS.logout, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
    }
  } catch (error) {
    console.warn('Logout API error:', error);
  }

  window.location.href = './login.html';
}

export function bindCommonNavbar(user, isGuest) {
  // Bind Badges
  const label = user ? (user.displayName || buildFallbackName(user.email)) : '';
  const badges = ['dashboardUserBadge', 'builderUserBadge', 'historyUserBadge', 'storyUserBadge'];
  badges.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = label;
  });

  // Bind Logout buttons
  const logoutButtons = ['dashboardLogoutBtn', 'builderLogoutBtn', 'historyLogoutBtn', 'storyLogoutBtn'];
  logoutButtons.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = isGuest ? '미리보기 종료' : '로그아웃';
      el.addEventListener('click', handleLogout);
    }
  });
}

export async function checkSessionOrRedirect() {
  const isGuestSession = sessionStorage.getItem('bloom_guest_session') === 'true';
  
  if (isGuestSession) {
    return {
      authenticated: false,
      isGuest: true,
      user: { id: '__guest__', email: '', displayName: 'Guest Preview' },
      authEnabled: false
    };
  }

  if (isGitHubPagesPreview() || !canUseAuthApi()) {
    // Force guest mode on github pages / local file://
    return {
      authenticated: false,
      isGuest: true,
      user: { id: '__guest__', email: '', displayName: 'Guest Preview' },
      authEnabled: false
    };
  }

  try {
    const result = await requestAuth(AUTH_ENDPOINTS.me, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    
    const payload = result.payload || {};
    if (result.ok && payload.authenticated && payload.user) {
      return {
        authenticated: true,
        isGuest: false,
        user: payload.user,
        authEnabled: payload.configured !== false
      };
    }
  } catch (error) {
    console.warn('Session check request failed:', error);
  }

  // Not authenticated and not guest: redirect to login
  window.location.href = './login.html';
  return null;
}

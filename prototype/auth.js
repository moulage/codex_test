const AUTH_TOKEN_KEY = 'virtual-pet-auth-token';

function getAuthTokenValue() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function setAuthTokenValue(token) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

async function authFetch(url, options = {}) {
  const token = getAuthTokenValue();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    setAuthTokenValue('');
    if (!window.location.pathname.endsWith('/login.html')) {
      window.location.href = '/login.html';
    }
  }
  return response;
}

function requireAuthPage() {
  if (!getAuthTokenValue()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

async function logoutAccount() {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } finally {
    setAuthTokenValue('');
    window.location.href = '/login.html';
  }
}

let authMode = 'login';

function showAuthMessage(text, isError = false) {
  const node = document.getElementById('authMessage');
  node.textContent = text;
  node.style.color = isError ? '#d84d5b' : '#16784f';
}

function renderAuthMode() {
  document.getElementById('loginTab').classList.toggle('active', authMode === 'login');
  document.getElementById('registerTab').classList.toggle('active', authMode === 'register');
  document.getElementById('displayNameInput').style.display = authMode === 'register' ? 'block' : 'none';
  document.getElementById('submitAuthBtn').textContent = authMode === 'register' ? '注册账号' : '登录账号';
}

async function submitAuth(event) {
  event.preventDefault();
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  const displayName = document.getElementById('displayNameInput').value.trim();
  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || '操作失败');
  }

  setAuthTokenValue(data.token);
  window.location.href = '/';
}

function bindEvents() {
  document.getElementById('loginTab').addEventListener('click', () => {
    authMode = 'login';
    renderAuthMode();
  });
  document.getElementById('registerTab').addEventListener('click', () => {
    authMode = 'register';
    renderAuthMode();
  });
  document.getElementById('authForm').addEventListener('submit', async (event) => {
    try {
      await submitAuth(event);
    } catch (error) {
      showAuthMessage(error.message, true);
    }
  });
}

function init() {
  if (getAuthTokenValue()) {
    window.location.href = '/';
    return;
  }
  bindEvents();
  renderAuthMode();
}

init();

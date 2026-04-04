let authMode = 'login';
let pendingStarterPetCode = '';

function setModalVisibility(id, visible) {
  const node = document.getElementById(id);
  if (!node) return;
  node.classList.toggle('hidden', !visible);
  node.setAttribute('aria-hidden', String(!visible));
}

function showAuthMessage(text, isError = false) {
  const node = document.getElementById('authMessage');
  node.textContent = text;
  node.style.color = isError ? '#d84d5b' : '#16784f';
}

function showAdoptionMessage(text, isError = false) {
  const node = document.getElementById('adoptionMessage');
  node.textContent = text;
  node.style.color = isError ? '#d84d5b' : '#16784f';
}

function renderAuthMode() {
  document.getElementById('loginTab').classList.toggle('active', authMode === 'login');
  document.getElementById('registerTab').classList.toggle('active', authMode === 'register');
  document.getElementById('displayNameInput').style.display = authMode === 'register' ? 'block' : 'none';
  document.getElementById('submitAuthBtn').textContent = authMode === 'register' ? '注册账号' : '登录账号';
}

function renderPetOptions(petGroups) {
  const container = document.getElementById('adoptionPetGrid');
  container.innerHTML = '';
  pendingStarterPetCode = '';

  petGroups.forEach((pet) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pet-option-card';
    card.dataset.petCode = pet.code;
    card.innerHTML = `
      <span class="pet-option-media">
        <img src="${pet.previewImagePath}" alt="${pet.name}" />
      </span>
      <strong>${pet.name}</strong>
      <span>第 ${pet.order} 只宠物</span>
    `;
    card.addEventListener('click', () => {
      pendingStarterPetCode = pet.code;
      document.querySelectorAll('.pet-option-card').forEach((node) => {
        node.classList.toggle('selected', node.dataset.petCode === pet.code);
      });
      document.getElementById('confirmAdoptionBtn').disabled = false;
      showAdoptionMessage(`已选中 ${pet.name}，确认后开始领养。`);
    });
    container.appendChild(card);
  });
}

async function fetchStarterPets() {
  const res = await authFetch('/api/config');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || '获取宠物列表失败');
  }
  return data.petGroups || [];
}

async function confirmAdoption() {
  const res = await authFetch('/api/onboarding/adopt-starter-pet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ starterPetCode: pendingStarterPetCode })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || '领养失败');
  }
  return data;
}

async function openAdoptionFlow() {
  const petGroups = await fetchStarterPets();
  renderPetOptions(petGroups);
  document.getElementById('confirmAdoptionBtn').disabled = true;
  showAdoptionMessage('请选择一只初始宠物。');
  setModalVisibility('adoptionModal', true);
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
  if (authMode === 'register') {
    await openAdoptionFlow();
    return;
  }
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
  document.getElementById('confirmAdoptionBtn').addEventListener('click', async () => {
    try {
      if (!pendingStarterPetCode) {
        throw new Error('请先选择一只宠物');
      }
      await confirmAdoption();
      window.location.href = '/';
    } catch (error) {
      showAdoptionMessage(error.message, true);
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

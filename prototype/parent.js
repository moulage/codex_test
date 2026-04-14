const GROUP_MAP = {
  '日常行为习惯': 'habitList',
  '学习': 'studyList',
  '运动': 'exerciseList'
};
const PARENT_GATE_STORAGE_KEY = 'virtual-pet-parent-pass';
const PARENT_GATE_TTL_MS = 10 * 60 * 1000;

let petGroups = [];
let parentGateAnswer = 0;

function isParentGateUnlocked() {
  const storedAt = Number(window.sessionStorage.getItem(PARENT_GATE_STORAGE_KEY) || 0);
  return storedAt > 0 && Date.now() - storedAt <= PARENT_GATE_TTL_MS;
}

function unlockParentGate() {
  window.sessionStorage.setItem(PARENT_GATE_STORAGE_KEY, String(Date.now()));
}

function setParentGateVisibility(visible) {
  const modal = document.getElementById('parentPageGateModal');
  modal.classList.toggle('hidden', !visible);
  modal.setAttribute('aria-hidden', String(!visible));
}

function showParentGateMessage(text, isError = false) {
  const node = document.getElementById('parentPageGateMessage');
  node.textContent = text;
  node.style.color = isError ? '#d84d5b' : '#16784f';
}

function createParentQuestion() {
  const left = Math.floor(Math.random() * 9) + 1;
  const right = Math.floor(Math.random() * 9) + 1;
  parentGateAnswer = left * right;
  document.getElementById('parentPageGateQuestion').textContent = `${left} × ${right} = ?`;
  document.getElementById('parentPageGateInput').value = '';
  showParentGateMessage('请输入正确答案后进入家长模式。');
}

async function fetchConfig() {
  const res = await authFetch('/api/config');
  if (!res.ok) throw new Error('获取配置失败');
  return res.json();
}

async function saveConfig(tasks, users) {
  const res = await authFetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks, users })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '保存失败');
  return data;
}

function createEditorRow(task = { title: '', goal: 1 }, groupName) {
  const row = document.createElement('div');
  row.className = 'editor-row';
  row.dataset.group = groupName;
  row.innerHTML = `
    <input class="editor-input title-input" type="text" maxlength="20" placeholder="任务名称" value="${task.title}" />
    <input class="editor-input goal-input" type="number" min="1" max="5" value="${task.goal}" />
    <button class="delete-btn" type="button">删除</button>
  `;

  row.querySelector('.delete-btn').addEventListener('click', () => {
    row.remove();
  });

  return row;
}

function createUserRow(user = { name: '', petName: '', starterPetCode: '' }) {
  const row = document.createElement('div');
  row.className = 'editor-row user-row';
  row.dataset.userId = user.id ? String(user.id) : '';
  const options = petGroups
    .map(
      (pet) =>
        `<option value="${pet.code}"${pet.code === user.starterPetCode ? ' selected' : ''}>${pet.name}</option>`
    )
    .join('');

  row.innerHTML = `
    <input class="editor-input title-input user-name-input" type="text" maxlength="20" placeholder="用户名称" value="${user.name || ''}" />
    <input class="editor-input title-input pet-name-input" type="text" maxlength="20" placeholder="宠物名字" value="${user.petName || ''}" />
    <select class="editor-input user-pet-select">${options}</select>
    <button class="delete-btn" type="button">删除</button>
  `;

  row.querySelector('.delete-btn').addEventListener('click', () => {
    row.remove();
  });

  return row;
}

function renderEditor(tasks) {
  Object.entries(GROUP_MAP).forEach(([groupName, containerId]) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const groupTasks = tasks.filter((task) => task.group === groupName);
    const source = groupTasks.length > 0 ? groupTasks : [{ title: '', goal: 1 }];
    source.forEach((task) => container.appendChild(createEditorRow(task, groupName)));
  });
}

function renderUsers(users) {
  const container = document.getElementById('userList');
  container.innerHTML = '';
  const source = users.length > 0 ? users : [{ name: '', petName: '', starterPetCode: petGroups[0]?.code || '' }];
  source.forEach((user) => container.appendChild(createUserRow(user)));
}

function collectTasks() {
  const rows = Array.from(document.querySelectorAll('.editor-row[data-group]'));
  return rows
    .map((row) => ({
      group: row.dataset.group,
      title: row.querySelector('.title-input').value.trim(),
      goal: Number(row.querySelector('.goal-input').value || 1)
    }))
    .filter((task) => task.title);
}

function collectUsers() {
  const rows = Array.from(document.querySelectorAll('.user-row'));
  return rows
    .map((row) => ({
      id: Number(row.dataset.userId || 0) || null,
      name: row.querySelector('.user-name-input').value.trim(),
      petName: row.querySelector('.pet-name-input').value.trim(),
      starterPetCode: row.querySelector('.user-pet-select').value
    }))
    .filter((user) => user.name && user.petName && user.starterPetCode);
}

function showMessage(text, isError = false) {
  const node = document.getElementById('parentMessage');
  node.textContent = text;
  node.style.color = isError ? '#d84d5b' : '#16784f';
}

function bindEvents() {
  document.getElementById('addHabitBtn').addEventListener('click', () => {
    document.getElementById('habitList').appendChild(createEditorRow({ title: '', goal: 1 }, '日常行为习惯'));
  });

  document.getElementById('addStudyBtn').addEventListener('click', () => {
    document.getElementById('studyList').appendChild(createEditorRow({ title: '', goal: 1 }, '学习'));
  });

  document.getElementById('addExerciseBtn').addEventListener('click', () => {
    document.getElementById('exerciseList').appendChild(createEditorRow({ title: '', goal: 1 }, '运动'));
  });

  document.getElementById('addUserBtn').addEventListener('click', () => {
    document.getElementById('userList').appendChild(
      createUserRow({ name: '', petName: '', starterPetCode: petGroups[0]?.code || '' })
    );
  });

  document.getElementById('saveBtn').addEventListener('click', async () => {
    try {
      const tasks = collectTasks();
      const users = collectUsers();
      await saveConfig(tasks, users);
      showMessage('任务和用户配置已保存。');
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    logoutAccount();
  });

  document.getElementById('confirmParentPageGateBtn').addEventListener('click', () => {
    const value = Number(document.getElementById('parentPageGateInput').value);
    if (value !== parentGateAnswer) {
      createParentQuestion();
      showParentGateMessage('答案不对，请再算一次。', true);
      return;
    }

    unlockParentGate();
    setParentGateVisibility(false);
  });
}

async function init() {
  if (!requireAuthPage()) return;
  bindEvents();
  if (!isParentGateUnlocked()) {
    createParentQuestion();
    setParentGateVisibility(true);
  }
  try {
    const config = await fetchConfig();
    petGroups = config.petGroups || [];
    renderUsers(config.users || []);
    renderEditor(config.tasks || []);
  } catch (error) {
    showMessage(error.message, true);
  }
}

init();

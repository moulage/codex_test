async function fetchState() {
  const res = await fetch('/api/state');
  if (!res.ok) {
    throw new Error('获取状态失败');
  }
  return res.json();
}

async function completeTask(taskId) {
  const res = await fetch(`/api/tasks/${taskId}/complete`, {
    method: 'POST'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || '完成任务失败');
  }
  return data;
}

async function resetState() {
  const res = await fetch('/api/reset', { method: 'POST' });
  if (!res.ok) {
    throw new Error('重置失败');
  }
  return res.json();
}

function render(state) {
  document.getElementById('petMood').textContent = `心情：${state.mood}`;
  document.getElementById('petStars').textContent = `星星：${state.stars}`;

  const taskList = document.getElementById('taskList');
  taskList.innerHTML = '';

  state.tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-item';

    const label = document.createElement('span');
    label.textContent = `${task.title}（+${task.stars}⭐）`;

    const btn = document.createElement('button');
    btn.textContent = task.done ? '已完成' : '完成任务';
    btn.disabled = task.done;
    btn.addEventListener('click', async () => {
      try {
        const latest = await completeTask(task.id);
        render(latest);
      } catch (error) {
        showMessage(error.message, true);
      }
    });

    li.appendChild(label);
    li.appendChild(btn);
    taskList.appendChild(li);
  });
}

function showMessage(text, isError = false) {
  const message = document.getElementById('message');
  message.textContent = text;
  message.style.color = isError ? '#d7263d' : '#157347';
}

async function init() {
  try {
    const state = await fetchState();
    render(state);

    document.getElementById('resetBtn').addEventListener('click', async () => {
      try {
        const reset = await resetState();
        render(reset);
        showMessage('已重置为初始状态');
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  } catch (error) {
    showMessage(error.message, true);
  }
}

init();

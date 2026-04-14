const GROUPS = ['日常行为习惯', '学习', '运动'];
const USER_STORAGE_KEY = 'virtual-pet-user-id';
const PARENT_GATE_STORAGE_KEY = 'virtual-pet-parent-pass';
const PARENT_GATE_TTL_MS = 10 * 60 * 1000;

let previousState = null;
let activeTab = '日常行为习惯';
let currentUserId = Number(window.localStorage.getItem(USER_STORAGE_KEY) || 0);
let activePlayCleanupTimer = 0;
let activePlayAnimationFrame = 0;
let parentGateAnswer = 0;

const PERIOD_LABELS = {
  dawn: '晨曦',
  morning: '上午',
  afternoon: '下午',
  night: '夜晚'
};

const PET_ACTION_EFFECTS = {
  'pet-1': { pettingClass: 'petting-sway', playClass: 'play-bounce', pettingBurst: 'hearts', playBurst: 'stars' },
  'pet-2': { pettingClass: 'petting-nod', playClass: 'play-spin', pettingBurst: 'bubbles', playBurst: 'balls' },
  'pet-3': { pettingClass: 'petting-wiggle', playClass: 'play-dash', pettingBurst: 'sparkles', playBurst: 'rackets' },
  'pet-4': { pettingClass: 'petting-glow', playClass: 'play-hop', pettingBurst: 'leaves', playBurst: 'stars' },
  'pet-5': { pettingClass: 'petting-roll', playClass: 'play-twist', pettingBurst: 'hearts', playBurst: 'notes' },
  'pet-6': { pettingClass: 'petting-bounce', playClass: 'play-rocket', pettingBurst: 'bubbles', playBurst: 'comets' },
  'pet-7': { pettingClass: 'petting-wave', playClass: 'play-spark', pettingBurst: 'sparkles', playBurst: 'crowns' }
};

const PET_PLAY_STYLES = {
  'pet-1': { runnerClass: 'runner-skip', yBias: -10, pauseCount: 2, speed: 1.02 },
  'pet-2': { runnerClass: 'runner-dribble', yBias: 6, pauseCount: 1, speed: 0.96 },
  'pet-3': { runnerClass: 'runner-zigzag', yBias: -2, pauseCount: 2, speed: 1.04 },
  'pet-4': { runnerClass: 'runner-glide', yBias: -14, pauseCount: 3, speed: 0.94 },
  'pet-5': { runnerClass: 'runner-twirl', yBias: 0, pauseCount: 2, speed: 1 },
  'pet-6': { runnerClass: 'runner-rocket', yBias: -18, pauseCount: 1, speed: 1.08 },
  'pet-7': { runnerClass: 'runner-prance', yBias: -6, pauseCount: 3, speed: 0.98 }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildPlayMotionProfile(petCode) {
  const style = PET_PLAY_STYLES[petCode] || PET_PLAY_STYLES['pet-1'];
  return {
    runnerClass: style.runnerClass,
    yBias: style.yBias,
    speed: 180 * style.speed,
    pauseCount: style.pauseCount
  };
}

function getPlayArenaRect() {
  const petCard = document.querySelector('.pet-card');
  if (petCard) {
    return {
      left: 18,
      top: 18,
      right: petCard.clientWidth - 18,
      bottom: petCard.clientHeight - 18
    };
  }

  const viewportWidth = window.innerWidth || 1440;
  const viewportHeight = window.innerHeight || 900;
  return {
    left: 24,
    top: 120,
    right: viewportWidth * 0.46,
    bottom: viewportHeight * 0.78
  };
}

function getRunnerHomePosition(runnerWidth, runnerHeight) {
  const overlay = document.getElementById('playOverlay');
  const petCharacter = document.getElementById('petCharacter');
  const overlayRect = overlay?.getBoundingClientRect();
  const petRect = petCharacter?.getBoundingClientRect();

  if (overlayRect && petRect) {
    return {
      x: petRect.left - overlayRect.left + (petRect.width - runnerWidth) / 2,
      y: petRect.top - overlayRect.top + (petRect.height - runnerHeight) / 2
    };
  }

  return {
    x: 120,
    y: 180
  };
}

function spawnRunnerDust(container, x, y, direction) {
  const dust = document.createElement('span');
  dust.className = `runner-dust ${direction > 0 ? 'to-left' : 'to-right'}`;
  dust.style.left = `${x}px`;
  dust.style.top = `${y}px`;
  container.appendChild(dust);
  window.setTimeout(() => dust.remove(), 900);
}

function spawnRunnerTrick(container, x, y, icon, type) {
  const trick = document.createElement('span');
  trick.className = `runner-trick ${type === 'spin' ? 'runner-trick-spin' : 'runner-trick-hop'}`;
  trick.textContent = icon;
  trick.style.left = `${x}px`;
  trick.style.top = `${y}px`;
  container.appendChild(trick);
  window.setTimeout(() => trick.remove(), 1100);
}

function buildApiUrl(path) {
  const url = new URL(path, window.location.origin);
  if (currentUserId) {
    url.searchParams.set('userId', String(currentUserId));
  }
  return url.pathname + url.search;
}

async function fetchState() {
  const res = await authFetch(buildApiUrl('/api/state'));
  if (!res.ok) throw new Error('获取状态失败');
  return res.json();
}

async function completeTask(taskId) {
  const res = await authFetch(buildApiUrl(`/api/tasks/${taskId}/complete`), { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '完成任务失败');
  return data;
}

function getPetMeta(state) {
  const pet = state.pet || {};
  const level = pet.level || 1;

  if (level >= 3) {
    return {
      stage: 'stage-3',
      title: `${pet.name || '宠物'}火力全开`,
      badge: '成长第 3 阶段',
      message: '当前宠物已经进入最高阶段。'
    };
  }

  if (level >= 2) {
    return {
      stage: 'stage-2',
      title: `${pet.name || '宠物'}持续进阶`,
      badge: '成长第 2 阶段',
      message: '当前宠物已经进入第 2 阶段。'
    };
  }

  return {
    stage: 'stage-1',
    title: `${pet.name || '宠物'}刚刚出发`,
    badge: '成长第 1 阶段',
    message: '从最简单的一项开始。'
  };
}

function getMoodClass(mood) {
  if (mood >= 9) return 'mood-high';
  if (mood >= 4) return 'mood-mid';
  return 'mood-low';
}

function groupTasks(tasks) {
  return tasks.reduce((acc, task) => {
    if (!acc[task.group]) acc[task.group] = [];
    acc[task.group].push(task);
    return acc;
  }, {});
}

function setGainText(id, text) {
  const node = document.getElementById(id);
  node.textContent = text;
  node.classList.remove('show');
  void node.offsetWidth;
  node.classList.add('show');
}

function triggerActionBurst(type) {
  const burst = document.getElementById('rewardBurst');
  burst.innerHTML = '';
  burst.classList.add('interaction-overlay-active');
  const iconMap = {
    hearts: ['💗', '💖', '💞'],
    bubbles: ['🫧', '💧', '🫧'],
    sparkles: ['✨', '⭐', '✨'],
    leaves: ['🍃', '🌿', '🍃'],
    stars: ['⭐', '✨', '⭐'],
    balls: ['🏀', '⚽', '🏸'],
    rackets: ['🏸', '🎾', '🏓'],
    notes: ['🎵', '🎶', '✨'],
    comets: ['⚡', '✨', '🌟'],
    crowns: ['👑', '✨', '⭐']
  };
  const icons = iconMap[type] || iconMap.stars;

  for (let index = 0; index < 7; index += 1) {
    const item = document.createElement('span');
    item.className = 'reward-star action-burst';
    item.textContent = icons[index % icons.length];
    item.style.setProperty('--x', `${35 + Math.random() * 30}%`);
    item.style.setProperty('--y', `${28 + Math.random() * 30}%`);
    item.style.setProperty('--dx', `${-110 + Math.random() * 220}px`);
    item.style.setProperty('--dy', `${-90 - Math.random() * 120}px`);
    item.style.animationDuration = '5s';
    burst.appendChild(item);
  }

  window.setTimeout(() => {
    burst.innerHTML = '';
    burst.classList.remove('interaction-overlay-active');
  }, 5000);
}

function triggerPetRunning(state = previousState) {
  const burst = document.getElementById('playOverlay');
  const petCharacter = document.getElementById('petCharacter');
  const arena = getPlayArenaRect();
  const motion = buildPlayMotionProfile(state?.pet?.code);
  burst.innerHTML = '';
  burst.classList.add('active');
  petCharacter.classList.add('is-hidden-playing');
  window.clearTimeout(activePlayCleanupTimer);
  window.cancelAnimationFrame(activePlayAnimationFrame);

  const iconMap = {
    'pet-1': '⭐',
    'pet-2': '🏀',
    'pet-3': '🏸',
    'pet-4': '🍃',
    'pet-5': '🎵',
    'pet-6': '⚡',
    'pet-7': '👑'
  };
  const runnerIcon = iconMap[state?.pet?.code] || '⭐';

  const runner = document.createElement('div');
  runner.className = `screen-runner ${motion.runnerClass}`;

  const runnerSprite = document.createElement('img');
  runnerSprite.className = 'screen-runner-sprite';
  runnerSprite.src = state?.pet?.imagePath || document.getElementById('petSprite').src;
  runnerSprite.alt = `${state?.pet?.name || '宠物'}奔跑中`;
  runner.appendChild(runnerSprite);

  const trail = document.createElement('div');
  trail.className = 'screen-runner-trail';
  for (let index = 0; index < 8; index += 1) {
    const item = document.createElement('span');
    item.className = 'screen-runner-spark';
    item.textContent = runnerIcon;
    item.style.animationDelay = `${index * 0.18}s`;
    trail.appendChild(item);
  }
  runner.appendChild(trail);

  burst.appendChild(runner);
  const runnerWidth = Math.max(112, Math.min(window.innerWidth * 0.16, 188));
  const runnerHeight = Math.max(112, Math.min(window.innerHeight * 0.24, 216));
  const runnerHome = getRunnerHomePosition(runnerWidth, runnerHeight);
  const minX = arena.left;
  const maxX = Math.max(minX + 40, arena.right - runnerWidth);
  const minY = arena.top + 24;
  const maxY = Math.max(minY + 40, arena.bottom - runnerHeight);
  let x = clamp(arena.left + 18, minX, maxX);
  let y = clamp((arena.top + arena.bottom) / 2 + motion.yBias, minY, maxY);
  let vx = motion.speed;
  let vy = (Math.random() * 90 + 55) * (Math.random() > 0.5 ? 1 : -1);
  let facing = 1;
  let previousTick = performance.now();
  let pauseUntil = 0;
  let remainingTricks = motion.pauseCount + 1;
  let nextTrickAt = previousTick + 1400 + Math.random() * 1200;
  const endAt = previousTick + 10000;

  const updateRunner = () => {
    runner.style.transform = `translate(${x}px, ${y}px) scaleX(${facing})`;
  };

  const step = (now) => {
    if (!runner.isConnected) return;
    const dt = Math.min(0.032, (now - previousTick) / 1000 || 0.016);
    previousTick = now;

    if (now < pauseUntil) {
      updateRunner();
      activePlayAnimationFrame = window.requestAnimationFrame(step);
      return;
    }

    x += vx * dt;
    y += vy * dt;

    if (x <= minX || x >= maxX) {
      x = clamp(x, minX, maxX);
      vx *= -1;
      facing = vx >= 0 ? 1 : -1;
      spawnRunnerDust(burst, x + runnerWidth * 0.45, y + runnerHeight * 0.72, facing);
      if (Math.random() > 0.35) {
        pauseUntil = now + 180 + Math.random() * 180;
      }
    }

    if (y <= minY || y >= maxY) {
      y = clamp(y, minY, maxY);
      vy *= -1;
    }

    if (Math.random() > 0.985) {
      vy += (Math.random() > 0.5 ? 1 : -1) * 24;
      vy = clamp(vy, -150, 150);
    }

    if (remainingTricks > 0 && now >= nextTrickAt) {
      spawnRunnerTrick(burst, x + runnerWidth * 0.5, y - 10, runnerIcon, Math.random() > 0.5 ? 'spin' : 'hop');
      pauseUntil = now + 260 + Math.random() * 240;
      remainingTricks -= 1;
      nextTrickAt = now + 1800 + Math.random() * 1600;
    }

    updateRunner();

    if (now < endAt) {
      activePlayAnimationFrame = window.requestAnimationFrame(step);
    }
  };

  updateRunner();
  activePlayAnimationFrame = window.requestAnimationFrame(step);

  activePlayCleanupTimer = window.setTimeout(() => {
    window.cancelAnimationFrame(activePlayAnimationFrame);
    const returnFacing = runnerHome.x >= x ? 1 : -1;
    facing = returnFacing;
    runner.animate(
      [
        { transform: `translate(${x}px, ${y}px) scaleX(${facing})` },
        { transform: `translate(${runnerHome.x}px, ${runnerHome.y}px) scaleX(${facing})` }
      ],
      {
        duration: 800,
        easing: 'cubic-bezier(0.22, 0.9, 0.24, 1)',
        fill: 'forwards'
      }
    );
    runner.style.transform = `translate(${runnerHome.x}px, ${runnerHome.y}px) scaleX(${facing})`;

    window.setTimeout(() => {
      burst.innerHTML = '';
      burst.classList.remove('active');
      petCharacter.classList.remove('is-hidden-playing');
    }, 800);
  }, 10000);
}

function triggerRewardBurst(count = 6) {
  const burst = document.getElementById('rewardBurst');
  burst.innerHTML = '';

  for (let index = 0; index < count; index += 1) {
    const star = document.createElement('span');
    star.className = 'reward-star';
    star.textContent = index % 2 === 0 ? '⭐' : '✨';
    star.style.setProperty('--x', `${35 + Math.random() * 30}%`);
    star.style.setProperty('--y', `${34 + Math.random() * 26}%`);
    star.style.setProperty('--dx', `${-90 + Math.random() * 180}px`);
    star.style.setProperty('--dy', `${-90 - Math.random() * 110}px`);
    burst.appendChild(star);
  }

  window.setTimeout(() => {
    burst.innerHTML = '';
  }, 1000);
}

function triggerMonsterBattle() {
  const arena = document.getElementById('monsterArena');
  arena.innerHTML = '';

  const monster = document.createElement('div');
  monster.className = 'monster-card';
  monster.innerHTML = `
    <span class="monster-eye left"></span>
    <span class="monster-eye right"></span>
    <span class="monster-mouth"></span>
    <span class="impact impact-a">💥</span>
    <span class="impact impact-b">✨</span>
  `;
  arena.appendChild(monster);

  window.setTimeout(() => {
    arena.innerHTML = '';
  }, 1000);
}

function animateReward() {
  const petCharacter = document.getElementById('petCharacter');
  petCharacter.classList.remove('is-celebrating');
  void petCharacter.offsetWidth;
  petCharacter.classList.add('is-celebrating');

  setGainText('starGain', '+1 星星');
  setGainText('moodGain', '+1 心情');
  setGainText('petScoreGain', '+10 成长分');
  triggerMonsterBattle();
  triggerRewardBurst();

  window.setTimeout(() => {
    petCharacter.classList.remove('is-celebrating');
    document.getElementById('starGain').classList.remove('show');
    document.getElementById('moodGain').classList.remove('show');
    document.getElementById('petScoreGain').classList.remove('show');
  }, 1100);
}

function triggerPetInteraction(action, state = previousState) {
  if (action === 'play') {
    triggerPetRunning(state);
    return;
  }

  const petCharacter = document.getElementById('petCharacter');
  const effect = PET_ACTION_EFFECTS[state?.pet?.code] || PET_ACTION_EFFECTS['pet-1'];
  const actionClass = action === 'petting' ? effect.pettingClass : effect.playClass;
  const burstType = action === 'petting' ? effect.pettingBurst : effect.playBurst;

  petCharacter.classList.remove(
    'petting-sway',
    'petting-nod',
    'petting-wiggle',
    'petting-glow',
    'petting-roll',
    'petting-bounce',
    'petting-wave',
    'play-bounce',
    'play-spin',
    'play-dash',
    'play-hop',
    'play-twist',
    'play-rocket',
    'play-spark'
  );
  void petCharacter.offsetWidth;
  petCharacter.style.animationDuration = '5s';
  petCharacter.classList.add(actionClass);
  triggerActionBurst(burstType);

  window.setTimeout(() => {
    petCharacter.classList.remove(actionClass);
    petCharacter.style.animationDuration = '';
  }, 5000);
}

function updateFireworks(active) {
  const fireworks = document.getElementById('fireworks');
  fireworks.classList.toggle('active', active);

  if (active && fireworks.childElementCount === 0) {
    const bursts = [
      { left: '16%', top: '18%', hue: '22', delay: '0s', size: 1 },
      { left: '76%', top: '20%', hue: '210', delay: '1.15s', size: 0.92 },
      { left: '30%', top: '34%', hue: '124', delay: '2.1s', size: 1.08 },
      { left: '68%', top: '40%', hue: '316', delay: '0.55s', size: 0.88 },
      { left: '12%', top: '42%', hue: '48', delay: '1.7s', size: 0.82 },
      { left: '52%', top: '16%', hue: '192', delay: '2.75s', size: 1.12 },
      { left: '84%', top: '36%', hue: '286', delay: '3.1s', size: 0.8 },
      { left: '42%', top: '46%', hue: '8', delay: '0.9s', size: 0.9 },
      { left: '60%', top: '30%', hue: '138', delay: '2.25s', size: 0.86 }
    ];
    bursts.forEach(({ left, top, hue, delay, size }) => {
      const shell = document.createElement('span');
      shell.className = 'firework';
      shell.style.left = left;
      shell.style.top = top;
      shell.style.setProperty('--firework-hue', hue);
      shell.style.setProperty('--firework-delay', delay);
      shell.style.setProperty('--firework-size', String(size));

      const core = document.createElement('span');
      core.className = 'firework-core';
      shell.appendChild(core);

      const trail = document.createElement('span');
      trail.className = 'firework-trail';
      shell.appendChild(trail);

      for (let index = 0; index < 18; index += 1) {
        const spark = document.createElement('span');
        spark.className = 'firework-spark';
        spark.style.setProperty('--angle', `${index * 20}deg`);
        spark.style.setProperty('--distance', `${54 + (index % 3) * 18}px`);
        spark.style.setProperty('--spark-delay', `${(index % 6) * 0.04}s`);
        shell.appendChild(spark);
      }

      const glow = document.createElement('span');
      glow.className = 'firework-glow';
      shell.appendChild(glow);

      for (let index = 0; index < 10; index += 1) {
        const ember = document.createElement('span');
        ember.className = 'firework-ember';
        ember.style.setProperty('--ember-angle', `${-26 + index * 6}deg`);
        ember.style.setProperty('--ember-drift', `${-22 + index * 4}px`);
        ember.style.setProperty('--ember-delay', `${0.26 + index * 0.03}s`);
        shell.appendChild(ember);
      }

      fireworks.appendChild(shell);
    });
  }

  if (!active) {
    fireworks.innerHTML = '';
  }
}

function renderTabs() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    const isActive = button.dataset.tab === activeTab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
}

function renderTaskPanels(state) {
  const grouped = groupTasks(state.tasks);
  const container = document.getElementById('taskPanels');
  container.innerHTML = '';

  GROUPS.forEach((groupName) => {
    const tasks = grouped[groupName] || [];
    const panel = document.createElement('section');
    panel.className = `task-panel${groupName === activeTab ? ' active' : ''}`;
    panel.dataset.group = groupName;

    const list = document.createElement('ul');
    list.className = 'task-list';

    tasks.forEach((task) => {
      const isDone = task.completedCount >= task.goal;
      const item = document.createElement('li');
      item.className = `task-item${isDone ? ' done' : ''}`;

      const copy = document.createElement('div');
      copy.className = 'task-copy';

      const title = document.createElement('p');
      title.className = 'task-title';
      title.textContent = task.title;

      const meta = document.createElement('p');
      meta.className = 'task-meta';
      meta.textContent = `已完成 ${task.completedCount}/${task.goal} 次 · 每次 +${task.rewardPetScore} 成长分`;

      const button = document.createElement('button');
      button.className = `task-btn${isDone ? ' is-complete' : ''}`;
      button.disabled = isDone;
      button.textContent = isDone ? '已完成' : '完成一次';
      button.addEventListener('click', async () => {
        try {
          const latest = await completeTask(task.id);
          render(latest);
          animateReward();
          showMessage(`${task.title} 完成一次，${latest.user.name} 的 ${latest.pet.name} 获得了 ${task.rewardPetScore} 成长分。`);
        } catch (error) {
          showMessage(error.message, true);
        }
      });

      copy.appendChild(title);
      copy.appendChild(meta);
      item.appendChild(copy);
      item.appendChild(button);
      list.appendChild(item);
    });

    if (tasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '这个分类暂时没有任务，可以去家长模式中设置。';
      panel.appendChild(empty);
    } else {
      panel.appendChild(list);
    }

    container.appendChild(panel);
  });

  const totalCompleted = state.totalCompleted || 0;
  document.getElementById('taskCounter').textContent = `今天已完成 ${totalCompleted} 项`;
  document.getElementById('taskTabHint').textContent = `当前显示：${activeTab}`;
  renderTabs();
}

function renderUserSelector(state) {
  const select = document.getElementById('userSelect');
  select.innerHTML = '';

  (state.users || []).forEach((user) => {
    const option = document.createElement('option');
    option.value = String(user.id);
    option.textContent = `${user.name} · ${user.petName || '宠物'}`;
    option.selected = user.id === state.user.id;
    select.appendChild(option);
  });

  currentUserId = state.user.id;
  window.localStorage.setItem(USER_STORAGE_KEY, String(currentUserId));
  document.getElementById('activeUserLabel').textContent = `${state.user.name} 与 ${state.user.petName || state.pet.name} 的成长档案`;
}

function renderCollection(state) {
  const list = document.getElementById('collectionList');
  list.innerHTML = '';

  (state.collection || []).forEach((pet) => {
    const item = document.createElement('div');
    item.className = `collection-item${pet.isCurrent ? ' current' : ''}${pet.isMaxLevel ? ' maxed' : ''}`;
    item.innerHTML = `
      <strong>${pet.name}</strong>
      <span>第 ${pet.pet_order} 只</span>
      <span>${pet.isCurrent ? `当前成长中 · ${pet.bestScore} 分` : pet.isMaxLevel ? '已满级持有' : `历史最高 ${pet.bestScore} 分`}</span>
      <span>最高等级 ${pet.bestLevel}</span>
    `;
    list.appendChild(item);
  });

  document.getElementById('collectionHint').textContent =
    `已解锁 ${state.progression.unlockedCount}/${state.progression.totalPets} 只宠物。` +
    (state.progression.nextPetCode ? ` 下一只：${state.progression.nextPetCode.replace('pet-', '宠物 ')}` : ' 已经解锁全部宠物。');
}

function render(state) {
  const totalCompleted = state.totalCompleted || 0;
  const totalPossible = state.tasks.reduce((sum, task) => sum + task.goal, 0) || 1;
  const petMeta = getPetMeta(state);
  const pet = state.pet || {};
  const currentPeriod = state.ui?.currentPeriod || 'morning';
  const backgrounds = state.ui?.backgrounds || {};

  renderUserSelector(state);

  if (backgrounds.page) {
    document.body.style.setProperty('--page-background', `url("${backgrounds.page}")`);
  }

  const petStageBackground = backgrounds.petPeriods?.[currentPeriod];
  if (petStageBackground) {
    document.getElementById('petStage').style.setProperty('--pet-stage-background', `url("${petStageBackground}")`);
  }

  const petCharacter = document.getElementById('petCharacter');
  petCharacter.className = `pet-character ${petMeta.stage} ${getMoodClass(state.mood)}`;
  if (document.querySelector('.screen-runner')) {
    petCharacter.classList.add('is-hidden-playing');
  }

  const petSprite = document.getElementById('petSprite');
  petSprite.src = pet.imagePath;
  petSprite.alt = `${pet.name || '宠物'}第 ${pet.level || 1} 阶段`;

  document.getElementById('petMood').textContent = state.mood;
  document.getElementById('petStars').textContent = state.stars;
  document.getElementById('petScore').textContent = pet.score || 0;
  document.getElementById('petTitle').textContent = petMeta.title;
  document.getElementById('petMoodBadge').textContent = petMeta.badge;
  document.getElementById('periodLabel').textContent = PERIOD_LABELS[currentPeriod] || '上午';
  document.getElementById('currentPetMiniLabel').textContent = pet.name || '宠物';
  document.getElementById('currentPetLabel').textContent = `${pet.name} · 第 ${pet.order} 只 · 当前 ${pet.level} 级`;
  document.getElementById('petHint').textContent = `${pet.hint} 当前已完成 ${totalCompleted}/${totalPossible} 项。`;
  document.getElementById('moodBar').style.width = `${(totalCompleted / totalPossible) * 100}%`;
  document.getElementById('petProgressBar').style.width = `${Math.min(100, ((pet.score || 0) / pet.totalScoreToUnlock) * 100)}%`;

  renderCollection(state);
  renderTaskPanels(state);
  updateFireworks((pet.level || 1) > 2);

  if (!previousState || previousState.user?.id !== state.user.id) {
    showMessage(petMeta.message);
  }

  previousState = state;
}

function showMessage(text, isError = false) {
  const message = document.getElementById('message');
  message.textContent = text;
  message.style.color = isError ? '#d84d5b' : '#16784f';
}

function isParentGateUnlocked() {
  const storedAt = Number(window.sessionStorage.getItem(PARENT_GATE_STORAGE_KEY) || 0);
  return storedAt > 0 && Date.now() - storedAt <= PARENT_GATE_TTL_MS;
}

function unlockParentGate() {
  window.sessionStorage.setItem(PARENT_GATE_STORAGE_KEY, String(Date.now()));
}

function setParentGateVisibility(visible) {
  const modal = document.getElementById('parentGateModal');
  modal.classList.toggle('hidden', !visible);
  modal.setAttribute('aria-hidden', String(!visible));
}

function showParentGateMessage(text, isError = false) {
  const node = document.getElementById('parentGateMessage');
  node.textContent = text;
  node.style.color = isError ? '#d84d5b' : '#16784f';
}

function createParentQuestion() {
  const left = Math.floor(Math.random() * 9) + 1;
  const right = Math.floor(Math.random() * 9) + 1;
  parentGateAnswer = left * right;
  document.getElementById('parentGateQuestion').textContent = `${left} × ${right} = ?`;
  document.getElementById('parentGateInput').value = '';
  showParentGateMessage('请输入正确答案后进入家长模式。');
}

function bindEvents() {
  document.getElementById('tabNav').addEventListener('click', (event) => {
    const button = event.target.closest('.tab-btn');
    if (!button) return;
    activeTab = button.dataset.tab;
    if (!previousState) return;
    renderTaskPanels(previousState);
  });

  document.getElementById('userSelect').addEventListener('change', async (event) => {
    currentUserId = Number(event.target.value || 0);
    window.localStorage.setItem(USER_STORAGE_KEY, String(currentUserId));
    previousState = null;
    try {
      render(await fetchState());
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  document.getElementById('petActionPetting').addEventListener('click', () => {
    triggerPetInteraction('petting');
    if (previousState?.pet?.name) {
      showMessage(`你轻轻摸了摸 ${previousState.pet.name}，它开心地回应你。`);
    }
  });

  document.getElementById('petActionPlay').addEventListener('click', () => {
    triggerPetInteraction('play');
    if (previousState?.pet?.name) {
      showMessage(`${previousState.pet.name} 正在屏幕中欢快奔跑。`);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    logoutAccount();
  });

  document.getElementById('parentModeLink').addEventListener('click', (event) => {
    if (isParentGateUnlocked()) {
      return;
    }

    event.preventDefault();
    createParentQuestion();
    setParentGateVisibility(true);
    document.getElementById('parentGateInput').focus();
  });

  document.getElementById('cancelParentGateBtn').addEventListener('click', () => {
    setParentGateVisibility(false);
  });

  document.getElementById('confirmParentGateBtn').addEventListener('click', () => {
    const value = Number(document.getElementById('parentGateInput').value);
    if (value !== parentGateAnswer) {
      createParentQuestion();
      showParentGateMessage('答案不对，请再算一次。', true);
      return;
    }

    unlockParentGate();
    window.location.href = '/parent.html';
  });
}

async function init() {
  if (!requireAuthPage()) return;
  bindEvents();
  try {
    const state = await fetchState();
    render(state);
  } catch (error) {
    showMessage(error.message, true);
  }
}

init();

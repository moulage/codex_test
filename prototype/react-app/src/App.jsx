import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TimePetBackground, PERIOD_THEME } from './components/TimePetBackground.jsx';

const AUTH_TOKEN_KEY = 'virtual-pet-auth-token';
const GROUPS = ['日常行为习惯', '学习', '运动'];
const LEARNING_TABS = ['拼音', '加减法', '英语'];
const MATH_TABS = [
  { id: 'addition', label: '加法', type: '两位数加法' },
  { id: 'subtraction', label: '减法', type: '两位数减一位数' }
];
const PARENT_GATE_STORAGE_KEY = 'virtual-pet-react-parent-pass';
const PARENT_GATE_TTL_MS = 10 * 60 * 1000;
const PLAY_ROUTINES = [
  {
    id: 'windmill',
    label: '风车旋舞',
    message: '宠物切到风车旋舞模式，正在舞台中央做高速转体。',
    symbols: ['🌀', '✨', '⚡', '💿'],
    motion: 'windmill'
  },
  {
    id: 'moonwalk',
    label: '太空滑步',
    message: '宠物开始太空滑步，像在发光地板上倒着飘过去。',
    symbols: ['🌙', '✨', '🎵', '💫'],
    motion: 'moonwalk'
  },
  {
    id: 'poplock',
    label: '机械震点',
    message: '宠物进入机械震点节奏，每一下卡点都在闪光。',
    symbols: ['⚡', '🎚️', '✨', '🔷'],
    motion: 'poplock'
  },
  {
    id: 'headspin',
    label: '头转冲击',
    message: '宠物正在做夸张的头转冲击，整块舞台都亮了起来。',
    symbols: ['💥', '⭐', '🪩', '✨'],
    motion: 'headspin'
  },
  {
    id: 'freezeflare',
    label: '定格火花',
    message: '宠物突然定格再炸开动作，像闪电一样卡住节拍。',
    symbols: ['⚡', '✨', '🔶', '💥'],
    motion: 'freeze'
  },
  {
    id: 'krumpblast',
    label: '狂震爆点',
    message: '宠物用大开大合的狂震动作把舞台气氛瞬间抬高。',
    symbols: ['🔥', '⚡', '💥', '🎚️'],
    motion: 'krump'
  },
  {
    id: 'gliderush',
    label: '滑翔突进',
    message: '宠物开始贴地滑翔，像踩着风一样从舞台两侧掠过。',
    symbols: ['💨', '✨', '🌠', '🎵'],
    motion: 'glide'
  },
  {
    id: 'tutwave',
    label: '方阵波浪',
    message: '宠物做出方阵切角和波浪连线，动作看起来又怪又准。',
    symbols: ['🔷', '〰️', '✨', '🧊'],
    motion: 'tut'
  },
  {
    id: 'backflipgroove',
    label: '后翻律动',
    message: '宠物接了一串后翻律动，落地后继续踩点摇摆。',
    symbols: ['🎉', '⭐', '✨', '⚡'],
    motion: 'flip'
  },
  {
    id: 'vortexstep',
    label: '旋涡步法',
    message: '宠物正在做旋涡步法，脚下像开出了一圈发光轨道。',
    symbols: ['🌀', '🔵', '✨', '💫'],
    motion: 'vortex'
  },
  {
    id: 'shoulderroll',
    label: '肩浪连甩',
    message: '宠物把肩浪和甩臂连在一起，整套动作松弛又帅气。',
    symbols: ['🌊', '✨', '🎵', '💥'],
    motion: 'roll'
  },
  {
    id: 'neonbounce',
    label: '霓虹弹跳',
    message: '宠物开始霓虹弹跳，像踩在电子鼓点上一样不断回弹。',
    symbols: ['🟢', '🟣', '✨', '🎵'],
    motion: 'bounce'
  },
  {
    id: 'shadowshuffle',
    label: '影子迷踪',
    message: '宠物用影子迷踪步连续换位，动作像瞬移一样奇特。',
    symbols: ['🌫️', '✨', '⚫', '💫'],
    motion: 'shuffle'
  },
  {
    id: 'laserpose',
    label: '激光摆拍',
    message: '宠物一边冲刺一边切换夸张摆拍，像在跟激光做配合。',
    symbols: ['🔺', '✨', '⚡', '🪩'],
    motion: 'laser'
  }
];
const PLAY_MODE_LABELS = {
  combo: '连招切换',
  battle: '街舞对战'
};
function shuffleArray(items) {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
}

function createPlaySession() {
  const mode = Math.random() > 0.5 ? 'battle' : 'combo';
  const pool = shuffleArray(PLAY_ROUTINES);

  if (mode === 'battle') {
    const left = pool[0];
    const right = pool[1];
    return {
      mode,
      totalMs: 10000,
      segments: [
        { routine: left, duration: 2000, note: '第一回合' },
        { routine: right, duration: 2000, note: '第二回合' },
        { routine: left, duration: 2000, note: '反击回合' },
        { routine: right, duration: 2000, note: '压轴回合' },
        { routine: pool[2], duration: 2000, note: '终极收招' }
      ]
    };
  }

  return {
    mode,
    totalMs: 10000,
    segments: [
      { routine: pool[0], duration: 2500, note: '起手' },
      { routine: pool[1], duration: 2500, note: '转接' },
      { routine: pool[2], duration: 2500, note: '爆点' },
      { routine: pool[3], duration: 2500, note: '收尾' }
    ]
  };
}

function createFloatItems(symbols, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `float-${Date.now()}-${index}`,
    symbol: symbols[index % symbols.length],
    left: `${12 + Math.random() * 72}%`,
    top: `${16 + Math.random() * 62}%`,
    delay: `${Math.random() * 0.8}s`,
    duration: `${2.4 + Math.random() * 1.8}s`
  }));
}

function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function setAuthToken(token) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function isParentGateUnlocked() {
  const storedAt = Number(window.sessionStorage.getItem(PARENT_GATE_STORAGE_KEY) || 0);
  return storedAt > 0 && Date.now() - storedAt <= PARENT_GATE_TTL_MS;
}

function unlockParentGate() {
  window.sessionStorage.setItem(PARENT_GATE_STORAGE_KEY, String(Date.now()));
}

function createMathQuestion() {
  const left = Math.floor(Math.random() * 9) + 1;
  const right = Math.floor(Math.random() * 9) + 1;
  return { left, right, answer: left * right };
}

function createBurstItems(symbols, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${Date.now()}-${symbols[index % symbols.length]}-${index}`,
    symbol: symbols[index % symbols.length],
    left: `${18 + Math.random() * 64}%`,
    top: `${26 + Math.random() * 42}%`,
    dx: `${-120 + Math.random() * 240}px`,
    dy: `${-120 - Math.random() * 140}px`,
    delay: `${Math.random() * 0.35}s`,
    duration: `${2.8 + Math.random() * 1.6}s`
  }));
}

function createToneEnvelope(gainNode, startAt, volume, attack, decay) {
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.linearRampToValueAtTime(volume, startAt + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + attack + decay);
}

function createFireworkBursts(count = 14) {
  const palettes = [
    ['#ffd166', '#ff7b72', '#fff1b6', '#ff9f68'],
    ['#74c0fc', '#d0ebff', '#91a7ff', '#4dabf7'],
    ['#ff85a1', '#ffc2d1', '#ffd6a5', '#ffe066'],
    ['#63e6be', '#96f2d7', '#8ce99a', '#fcc419']
  ];

  return Array.from({ length: count }, (_, burstIndex) => {
    const particleCount = 24 + (burstIndex % 5) * 3;
    const palette = palettes[burstIndex % palettes.length];
    const originX = 10 + Math.random() * 80;
    const originY = 10 + Math.random() * 56;
    const delay = burstIndex * 0.12;

    return {
      id: `firework-burst-${Date.now()}-${burstIndex}`,
      left: `${originX}%`,
      top: `${originY}%`,
      delay: `${delay}s`,
      particles: Array.from({ length: particleCount }, (_, particleIndex) => {
        const angle = (Math.PI * 2 * particleIndex) / particleCount;
        const distance = 90 + Math.random() * 120;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        return {
          id: `particle-${burstIndex}-${particleIndex}`,
          dx: `${dx}px`,
          dy: `${dy}px`,
          color: palette[particleIndex % palette.length],
          duration: `${4.2 + Math.random() * 0.8}s`,
          size: `${6 + Math.random() * 7}px`
        };
      })
    };
  });
}

async function requestJson(path, options = {}, tokenOverride = null) {
  const token = tokenOverride === null ? getAuthToken() : tokenOverride;
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || '请求失败');
  }
  return data;
}

function buildStatePath(userId = '') {
  const params = new URLSearchParams();
  if (userId) params.set('userId', String(userId));
  return `/api/state${params.toString() ? `?${params.toString()}` : ''}`;
}

function buildTaskPath(taskId, userId = '') {
  const params = new URLSearchParams();
  if (userId) params.set('userId', String(userId));
  return `/api/tasks/${taskId}/complete${params.toString() ? `?${params.toString()}` : ''}`;
}

function formatPetRole(period) {
  const roleMap = {
    dawn: '晨光队长',
    morning: '阳光小跑者',
    afternoon: '冒险飞行员',
    night: '梦境守护员'
  };
  return roleMap[period] || '宠物伙伴';
}

function groupTasks(tasks) {
  return tasks.reduce((acc, task) => {
    if (!acc[task.group]) acc[task.group] = [];
    acc[task.group].push(task);
    return acc;
  }, {});
}

function createBlankTask(group) {
  return {
    id: `draft-task-${group}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    group,
    title: '',
    goal: 1,
    rewardPetScore: 100
  };
}

function createBlankUser(defaultPetCode = '') {
  return {
    id: null,
    name: '',
    petName: '',
    starterPetCode: defaultPetCode
  };
}

function createUniqueMathProblems(count, buildProblem) {
  const expressions = new Set();
  const problems = [];
  const createdAt = Date.now();
  let attempts = 0;
  const maxAttempts = count * 50;

  while (problems.length < count && attempts < maxAttempts) {
    const problem = buildProblem(problems.length, createdAt);
    attempts += 1;
    if (expressions.has(problem.expression)) {
      continue;
    }

    expressions.add(problem.expression);
    problems.push(problem);
  }

  return problems;
}

function createLearningProblems() {
  const additionProblems = createUniqueMathProblems(6, (index, createdAt) => {
    const left = Math.floor(Math.random() * 80) + 10;
    const right = Math.floor(Math.random() * (99 - left)) + 1;
    return {
      id: `addition-${createdAt}-${index}`,
      mathTab: 'addition',
      type: '两位数加法',
      expression: `${left} + ${right} = ?`,
      answer: left + right
    };
  });

  const subtractionProblems = createUniqueMathProblems(6, (index, createdAt) => {
    const left = Math.floor(Math.random() * 90) + 10;
    const right = Math.floor(Math.random() * 9) + 1;
    return {
      id: `subtraction-${createdAt}-${index}`,
      mathTab: 'subtraction',
      type: '两位数减一位数',
      expression: `${left} - ${right} = ?`,
      answer: left - right
    };
  });

  return [...additionProblems, ...subtractionProblems]
    .sort(() => Math.random() - 0.5);
}

function createEmptyAnswers(problems) {
  return problems.reduce((acc, problem) => {
    acc[problem.id] = '';
    return acc;
  }, {});
}

function createMathPracticeSet() {
  const problems = createLearningProblems();
  return {
    problems,
    answers: createEmptyAnswers(problems)
  };
}

function createPinyinPracticeSet() {
  const syllables = [
    { word: '妈', pinyin: 'mā', speak: 'ma1', category: '声调' },
    { word: '鱼', pinyin: 'yú', speak: 'yu2', category: '整体认读' },
    { word: '火', pinyin: 'huǒ', speak: 'huo3', category: '三拼音节' },
    { word: '月', pinyin: 'yuè', speak: 'yue4', category: '复韵母' },
    { word: '花', pinyin: 'huā', speak: 'hua1', category: '三拼音节' },
    { word: '桥', pinyin: 'qiáo', speak: 'qiao2', category: '介母练习' },
    { word: '云', pinyin: 'yún', speak: 'yun2', category: '前鼻音' },
    { word: '星', pinyin: 'xīng', speak: 'xing1', category: '后鼻音' }
  ];
  const initials = [
    { label: 'b', speak: 'bo' },
    { label: 'p', speak: 'po' },
    { label: 'm', speak: 'mo' },
    { label: 'f', speak: 'fo' },
    { label: 'd', speak: 'de' },
    { label: 't', speak: 'te' },
    { label: 'n', speak: 'ne' },
    { label: 'l', speak: 'le' },
    { label: 'g', speak: 'ge' },
    { label: 'k', speak: 'ke' },
    { label: 'h', speak: 'he' },
    { label: 'j', speak: 'ji' },
    { label: 'q', speak: 'qi' },
    { label: 'x', speak: 'xi' },
    { label: 'zh', speak: 'zhi' },
    { label: 'ch', speak: 'chi' },
    { label: 'sh', speak: 'shi' },
    { label: 'r', speak: 'ri' },
    { label: 'z', speak: 'zi' },
    { label: 'c', speak: 'ci' },
    { label: 's', speak: 'si' },
    { label: 'y', speak: 'yi' },
    { label: 'w', speak: 'wu' }
  ];
  const finals = [
    { label: 'a', speak: 'a' },
    { label: 'o', speak: 'o' },
    { label: 'e', speak: 'e' },
    { label: 'i', speak: 'yi' },
    { label: 'u', speak: 'wu' },
    { label: 'ai', speak: 'ai' },
    { label: 'ei', speak: 'ei' },
    { label: 'ao', speak: 'ao' },
    { label: 'ou', speak: 'ou' },
    { label: 'an', speak: 'an' },
    { label: 'en', speak: 'en' },
    { label: 'ang', speak: 'ang' },
    { label: 'eng', speak: 'eng' },
    { label: 'ong', speak: 'ong' },
    { label: 'ia', speak: 'ya' },
    { label: 'ie', speak: 'ye' },
    { label: 'iao', speak: 'yao' },
    { label: 'iu', speak: 'you' },
    { label: 'ian', speak: 'yan' },
    { label: 'ing', speak: 'ying' },
    { label: 'ua', speak: 'wa' },
    { label: 'uo', speak: 'wo' },
    { label: 'uai', speak: 'wai' },
    { label: 'ui', speak: 'wei' },
    { label: 'uan', speak: 'wan' },
    { label: 'un', speak: 'wen' }
  ];

  return {
    matching: syllables.sort(() => Math.random() - 0.5).slice(0, 6),
    initials: initials.sort(() => Math.random() - 0.5).slice(0, 8),
    finals: finals.sort(() => Math.random() - 0.5).slice(0, 8)
  };
}

function createEnglishPracticeSet() {
  const words = [
    { word: 'apple', meaning: '苹果', sentence: 'I eat an apple.' },
    { word: 'book', meaning: '书', sentence: 'This is my book.' },
    { word: 'cat', meaning: '猫', sentence: 'The cat is sleepy.' },
    { word: 'dog', meaning: '狗', sentence: 'The dog can run.' },
    { word: 'sun', meaning: '太阳', sentence: 'The sun is bright.' },
    { word: 'moon', meaning: '月亮', sentence: 'The moon is round.' },
    { word: 'milk', meaning: '牛奶', sentence: 'I like milk.' },
    { word: 'school', meaning: '学校', sentence: 'I go to school.' }
  ].sort(() => Math.random() - 0.5).slice(0, 6);

  const phrases = [
    'Good morning.',
    'How are you?',
    'Thank you.',
    'See you tomorrow.',
    'I am happy.',
    'Let us read.'
  ].sort(() => Math.random() - 0.5).slice(0, 4);

  return {
    words,
    phrases
  };
}

function RewardOverlay({ items, fireworks }) {
  if (!items.length && !fireworks) return null;
  return (
    <div className={`reward-overlay${fireworks ? ' fireworks-on' : ''}`} aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.id}
          className="reward-burst-item"
          style={{
            left: item.left,
            top: item.top,
            '--dx': item.dx,
            '--dy': item.dy,
            animationDelay: item.delay,
            animationDuration: item.duration
          }}
        >
          {item.symbol}
        </span>
      ))}
      {fireworks
        ? fireworks.map((burst) => (
            <span
              key={burst.id}
              className="reward-firework-burst"
              style={{
                left: burst.left,
                top: burst.top,
                animationDelay: burst.delay
              }}
            >
              <span className="reward-firework-core" />
              {burst.particles.map((particle) => (
                <span
                  key={particle.id}
                  className="reward-firework-particle"
                  style={{
                    '--dx': particle.dx,
                    '--dy': particle.dy,
                    '--spark-color': particle.color,
                    '--spark-size': particle.size,
                    animationDelay: burst.delay,
                    animationDuration: particle.duration
                  }}
                />
              ))}
            </span>
          ))
        : null}
    </div>
  );
}

function LearningPetRunner({ visible, petImagePath, petName }) {
  if (!visible || !petImagePath) return null;

  return (
    <div className="learning-pet-runner" aria-hidden="true">
      <div className="learning-pet-track">
        <span className="learning-pet-bubble">{petName || '宠物伙伴'} 来玩啦</span>
        <img className="learning-pet-sprite" src={petImagePath} alt={petName || '宠物伙伴'} />
        <span className="learning-pet-dust dust-a">✨</span>
        <span className="learning-pet-dust dust-b">⭐</span>
        <span className="learning-pet-dust dust-c">💨</span>
      </div>
    </div>
  );
}

function LearningSadFace({ visible }) {
  if (!visible) return null;

  return (
    <div className="learning-sad-face" aria-hidden="true">
      <div className="learning-sad-face-emoji">😭</div>
    </div>
  );
}

function LearningPage({
  activeTab,
  onTabChange,
  activeMathTab,
  onMathTabChange,
  pinyinPractice,
  onRefreshPinyin,
  englishPractice,
  onRefreshEnglish,
  onSpeakText,
  mathProblems,
  mathAnswers,
  mathCheckedTabs,
  learningPetVisible,
  learningSadVisible,
  learningPetImagePath,
  learningPetName,
  onMathAnswerChange,
  onCheckMath,
  onRefreshMath,
  onBack
}) {
  const currentMathMeta = MATH_TABS.find((tab) => tab.id === activeMathTab) || MATH_TABS[0];
  const visibleMathProblems = mathProblems.filter((problem) => problem.mathTab === currentMathMeta.id);
  const answeredCount = visibleMathProblems.filter((problem) => String(mathAnswers[problem.id] || '').trim() !== '').length;
  const correctCount = visibleMathProblems.filter((problem) => String(mathAnswers[problem.id] || '').trim() !== '' && Number(mathAnswers[problem.id]) === problem.answer).length;
  const allMathAnswered = answeredCount === visibleMathProblems.length;
  const mathChecked = Boolean(mathCheckedTabs[currentMathMeta.id]);

  return (
    <section className="learning-shell">
      <LearningSadFace visible={learningSadVisible} />
      <LearningPetRunner
        visible={learningPetVisible}
        petImagePath={learningPetImagePath}
        petName={learningPetName}
      />
      <header className="learning-topbar">
        <div>
          <p className="demo-card-kicker">学习乐园</p>
          <h2>选择一个学习主题开始练习</h2>
          <p className="demo-copy">这里先开放拼音、加减法、英语三个入口，目前优先完成加减法练习生成。</p>
        </div>
        <button type="button" className="demo-action ghost" onClick={onBack}>
          返回首页
        </button>
      </header>

      <div className="learning-tabs" role="tablist" aria-label="学习类型">
        {LEARNING_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`demo-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === '拼音' ? (
        <section className="learning-card">
          <div className="learning-card-head">
            <div>
              <p className="demo-card-kicker">拼音练习</p>
              <h3>认读 + 声母 + 韵母</h3>
              <p className="demo-copy">先认读常见拼音，再熟悉声母和韵母，适合每天快速过一遍。</p>
            </div>
            <button type="button" className="demo-action" onClick={onRefreshPinyin}>
              换一组
            </button>
          </div>

          <div className="learning-pinyin-layout">
            <section className="learning-subcard">
              <strong>认读卡片</strong>
              <div className="learning-pinyin-grid">
                {pinyinPractice.matching.map((item) => (
                  <button
                    key={`${item.word}-${item.pinyin}`}
                    type="button"
                    className="learning-pinyin-card learning-speak-card"
                    onClick={() => onSpeakText(item.speak, 'zh-CN')}
                  >
                    <span className="learning-pinyin-word">{item.word}</span>
                    <strong>{item.pinyin}</strong>
                    <span>{item.category}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="learning-subcard">
              <strong>本轮声母</strong>
              <div className="learning-chip-row">
                {pinyinPractice.initials.map((item) => (
                  <button key={item.label} type="button" className="learning-chip learning-chip-button" onClick={() => onSpeakText(item.speak, 'zh-CN')}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="learning-subcard">
              <strong>本轮韵母</strong>
              <div className="learning-chip-row">
                {pinyinPractice.finals.map((item) => (
                  <button key={item.label} type="button" className="learning-chip learning-chip-button" onClick={() => onSpeakText(item.speak, 'zh-CN')}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>
      ) : activeTab === '加减法' ? (
        <section className="learning-card">
          <div className="learning-card-head">
            <div>
              <p className="demo-card-kicker">加减法练习</p>
              <h3>{currentMathMeta.label}练习</h3>
              <p className="demo-copy">加法和减法分开练习，每个 tab 6 题，先自己填写答案，再统一检查。</p>
            </div>
            <div className="learning-actions">
              <button type="button" className="demo-action secondary" onClick={() => onCheckMath(currentMathMeta.id)} disabled={!allMathAnswered}>
                检查答案
              </button>
              <button type="button" className="demo-action" onClick={onRefreshMath}>
                重做一组
              </button>
            </div>
          </div>

          <div className="demo-tabs task-tabs" role="tablist" aria-label="加减法类型">
            {MATH_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`demo-tab${activeMathTab === tab.id ? ' active' : ''}`}
                onClick={() => onMathTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="learning-summary">
            <strong>已作答 {answeredCount}/{visibleMathProblems.length} 题</strong>
            <span>{mathChecked ? `检查完成，答对 ${correctCount}/${visibleMathProblems.length} 题` : allMathAnswered ? '填写完成后点击“检查答案”统一校验' : `请先完成全部 ${visibleMathProblems.length} 题，再检查答案`}</span>
          </div>

          <div className="learning-math-grid">
            {visibleMathProblems.map((problem, index) => {
              const currentAnswer = String(mathAnswers[problem.id] || '').trim();
              const hasValue = currentAnswer !== '';
              const isCorrect = mathChecked && hasValue && Number(currentAnswer) === problem.answer;
              const isWrong = mathChecked && hasValue && Number(currentAnswer) !== problem.answer;

              return (
                <article
                  key={problem.id}
                  className={`learning-problem-card${
                    isCorrect ? ' is-correct' : isWrong ? ' is-wrong' : ''
                  }`}
                >
                  <span className="learning-problem-index">第 {index + 1} 题</span>
                  <strong>{problem.expression}</strong>
                  <span>{problem.type}</span>
                  <input
                    className="demo-input learning-answer-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="填写答案"
                    value={mathAnswers[problem.id] || ''}
                    onChange={(event) => onMathAnswerChange(problem.id, event.target.value)}
                  />
                  {mathChecked && hasValue ? (
                    <span className="learning-answer-status">
                      {isCorrect ? '回答正确' : `正确答案：${problem.answer}`}
                    </span>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : activeTab === '英语' ? (
        <section className="learning-card">
          <div className="learning-card-head">
            <div>
              <p className="demo-card-kicker">英语练习</p>
              <h3>单词认读 + 短句跟读</h3>
              <p className="demo-copy">先看单词和中文意思，再跟读简单短句，适合入门练习。</p>
            </div>
            <button type="button" className="demo-action" onClick={onRefreshEnglish}>
              换一组
            </button>
          </div>

          <div className="learning-pinyin-layout">
            <section className="learning-subcard">
              <strong>单词卡片</strong>
              <div className="learning-pinyin-grid">
                {englishPractice.words.map((item) => (
                  <button
                    key={item.word}
                    type="button"
                    className="learning-pinyin-card learning-speak-card"
                    onClick={() => onSpeakText(item.word, 'en-US')}
                  >
                    <span className="learning-english-word">{item.word}</span>
                    <strong>{item.meaning}</strong>
                    <span>{item.sentence}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="learning-subcard">
              <strong>日常短句</strong>
              <div className="learning-chip-row">
                {englishPractice.phrases.map((item) => (
                  <button key={item} type="button" className="learning-chip learning-chip-button" onClick={() => onSpeakText(item, 'en-US')}>
                    {item}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>
      ) : (
        <section className="learning-empty">
          <p className="demo-card-kicker">{activeTab}</p>
          <h3>这个模块下一步补充</h3>
          <p className="demo-copy">当前先完成核心学习能力，后续可以继续补更多互动玩法。</p>
        </section>
      )}
    </section>
  );
}

function ParentGateModal({ visible, question, answerInput, setAnswerInput, error, onClose, onConfirm }) {
  if (!visible) return null;
  return (
    <div className="demo-modal-shell">
      <div className="demo-modal-backdrop" onClick={onClose} />
      <section className="demo-modal-card">
        <p className="demo-card-kicker">家长验证</p>
        <h2>答对乘法题再进入家长模式</h2>
        <p className="demo-gate-question">
          {question.left} × {question.right} = ?
        </p>
        <input
          className="demo-input"
          type="number"
          inputMode="numeric"
          placeholder="请输入答案"
          value={answerInput}
          onChange={(event) => setAnswerInput(event.target.value)}
        />
        <div className="demo-modal-actions">
          <button type="button" className="demo-action secondary" onClick={onClose}>
            取消
          </button>
          <button type="button" className="demo-action" onClick={onConfirm}>
            进入家长模式
          </button>
        </div>
        <p className={`demo-status${error ? ' is-error' : ''}`}>{error || '请输入正确答案后进入家长模式。'}</p>
      </section>
    </div>
  );
}

function ParentModePage({
  visible,
  loading,
  error,
  config,
  draftTasks,
  draftUsers,
  saveMessage,
  saveError,
  saving,
  onBack,
  onTaskChange,
  onAddTask,
  onDeleteTask,
  onUserChange,
  onAddUser,
  onDeleteUser,
  onSave
}) {
  if (!visible) return null;
  const groupedTasks = groupTasks(draftTasks);
  const petOptions = config?.petGroups || [];

  return (
    <main className="parent-page">
      <section className="parent-page-shell">
        <header className="parent-page-topbar">
          <div>
            <p className="demo-card-kicker">家长模式</p>
            <h2>任务与成员配置</h2>
            <p className="demo-copy">这里直接连接主项目配置接口，保存后孩子模式会立即使用新的任务和用户数据。</p>
          </div>
          <div className="demo-toolbar">
            <button type="button" className="demo-action secondary" onClick={onSave} disabled={saving || loading}>
              {saving ? '保存中...' : '保存配置'}
            </button>
            <button type="button" className="demo-action ghost" onClick={onBack}>
              返回孩子模式
            </button>
          </div>
        </header>

        {saveMessage && !saveError ? <div className="parent-save-banner">保存成功，孩子模式已同步最新配置。</div> : null}

        {loading ? <section className="demo-empty"><h2>正在读取家长配置</h2><p>稍等一下，正在同步任务和成员信息。</p></section> : null}
        {error ? <section className="demo-empty"><h2>读取失败</h2><p>{error}</p></section> : null}

        {!loading && !error ? (
          <div className="parent-editor-layout">
            <section className="parent-editor-card">
              <div className="parent-editor-head">
                <div>
                  <p className="demo-card-kicker">用户设置</p>
                  <h3>家庭成员与起始宠物</h3>
                </div>
                <button type="button" className="demo-action secondary" onClick={onAddUser}>
                  新增用户
                </button>
              </div>

              <div className="parent-editor-list">
                {draftUsers.map((user, index) => (
                  <article key={user.id || `draft-user-${index}`} className="parent-editor-row">
                    <input
                      className="demo-input"
                      type="text"
                      placeholder="用户名称"
                      value={user.name}
                      onChange={(event) => onUserChange(index, 'name', event.target.value)}
                    />
                    <input
                      className="demo-input"
                      type="text"
                      placeholder="宠物昵称"
                      value={user.petName}
                      onChange={(event) => onUserChange(index, 'petName', event.target.value)}
                    />
                    <select
                      className="demo-select"
                      value={user.starterPetCode}
                      onChange={(event) => onUserChange(index, 'starterPetCode', event.target.value)}
                    >
                      {petOptions.map((pet) => (
                        <option key={pet.code} value={pet.code}>
                          {pet.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="demo-action ghost" onClick={() => onDeleteUser(index)} disabled={draftUsers.length <= 1}>
                      删除
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="parent-editor-card">
              <div className="parent-editor-head">
                <div>
                  <p className="demo-card-kicker">任务设置</p>
                  <h3>孩子模式任务清单</h3>
                </div>
              </div>

              <div className="parent-task-groups">
                {GROUPS.map((group) => (
                  <section key={group} className="parent-task-group">
                    <div className="parent-editor-head compact">
                      <div>
                        <strong>{group}</strong>
                        <p className="demo-copy">每项任务每天最多完成 1 到 5 次。</p>
                      </div>
                      <button type="button" className="demo-action secondary" onClick={() => onAddTask(group)}>
                        新增任务
                      </button>
                    </div>

                    <div className="parent-editor-list">
                      {(groupedTasks[group] || []).map((task) => (
                        <article key={task.id} className="parent-editor-row">
                          <input
                            className="demo-input parent-task-title"
                            type="text"
                            placeholder="任务名称"
                            value={task.title}
                            onChange={(event) => onTaskChange(task.id, 'title', event.target.value)}
                          />
                          <input
                            className="demo-input parent-task-goal"
                            type="number"
                            min="1"
                            max="5"
                            value={task.goal}
                            onChange={(event) => onTaskChange(task.id, 'goal', event.target.value)}
                          />
                          <button type="button" className="demo-action ghost" onClick={() => onDeleteTask(task.id)}>
                            删除
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section className="parent-editor-card">
              <p className="demo-card-kicker">状态</p>
              <p className={`demo-status${saveError ? ' is-error' : saveMessage ? ' is-success' : ''}`}>{saveError || saveMessage || '修改任务或成员后点击“保存配置”。'}</p>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function AdoptionModal({ visible, pets, selectedPetCode, onSelect, onConfirm, error }) {
  if (!visible) return null;
  return (
    <div className="demo-modal-shell">
      <div className="demo-modal-backdrop" />
      <section className="demo-modal-card large">
        <p className="demo-card-kicker">注册成功</p>
        <h2>选择你的初始宠物</h2>
        <p className="demo-copy">下面 7 只宠物都可以领养，选中后会作为这个账号的第一只初始宠物。</p>
        <div className="adoption-grid">
          {pets.map((pet) => (
            <button
              key={pet.code}
              type="button"
              className={`adoption-card${selectedPetCode === pet.code ? ' selected' : ''}`}
              onClick={() => onSelect(pet.code)}
            >
              <span className="adoption-card-media">
                <img src={pet.previewImagePath} alt={pet.name} />
              </span>
              <strong>{pet.name}</strong>
              <span>第 {pet.order} 只宠物</span>
            </button>
          ))}
        </div>
        <div className="demo-modal-actions end">
          <button type="button" className="demo-action" onClick={onConfirm} disabled={!selectedPetCode}>
            确认领养
          </button>
        </div>
        <p className={`demo-status${error ? ' is-error' : ''}`}>{error || '请选择一只初始宠物。'}</p>
      </section>
    </div>
  );
}

function ClaimNextPetModal({ visible, nextPet, loading, error, onConfirm }) {
  if (!visible || !nextPet) return null;
  return (
    <div className="demo-modal-shell">
      <div className="demo-modal-backdrop" />
      <section className="demo-modal-card claim-next-modal">
        <div className="claim-next-burst" aria-hidden="true">
          <span className="claim-next-ring ring-a" />
          <span className="claim-next-ring ring-b" />
          <span className="claim-next-star star-a">✨</span>
          <span className="claim-next-star star-b">🌟</span>
          <span className="claim-next-star star-c">🎁</span>
        </div>
        <p className="demo-card-kicker">新宠物解锁</p>
        <h2>第 {nextPet.order} 只宠物可以领取了</h2>
        <p className="demo-copy">当前宠物已经达到顶级，现在可以选择领取下一只宠物继续成长。</p>
        <button type="button" className="adoption-card selected claim-card" onClick={onConfirm} disabled={loading}>
          <span className="adoption-card-media">
            <img src={nextPet.previewImagePath} alt={nextPet.name} />
          </span>
          <strong>{nextPet.name}</strong>
          <span>点击领取第 {nextPet.order} 只宠物</span>
        </button>
        <p className={`demo-status${error ? ' is-error' : ''}`}>{error || '确认后会切换到新的宠物继续培养。'}</p>
        <div className="demo-modal-actions end">
          <button type="button" className="demo-action" onClick={onConfirm} disabled={loading}>
            {loading ? '领取中...' : '确认领取'}
          </button>
        </div>
      </section>
    </div>
  );
}

function App() {
  const initialMathPractice = createMathPracticeSet();
  const [authToken, setAuthTokenState] = useState(() => getAuthToken());
  const [currentView, setCurrentView] = useState('home');
  const [activeLearningTab, setActiveLearningTab] = useState('加减法');
  const [activeMathTab, setActiveMathTab] = useState(MATH_TABS[0].id);
  const [pinyinPractice, setPinyinPractice] = useState(() => createPinyinPracticeSet());
  const [englishPractice, setEnglishPractice] = useState(() => createEnglishPracticeSet());
  const [mathProblems, setMathProblems] = useState(initialMathPractice.problems);
  const [mathAnswers, setMathAnswers] = useState(initialMathPractice.answers);
  const [mathCheckedTabs, setMathCheckedTabs] = useState(() => ({
    addition: false,
    subtraction: false
  }));
  const [learningPetVisible, setLearningPetVisible] = useState(false);
  const [learningSadVisible, setLearningSadVisible] = useState(false);
  const [state, setState] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [previewPeriod, setPreviewPeriod] = useState('');
  const [activeGroup, setActiveGroup] = useState(GROUPS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [interactionMode, setInteractionMode] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSession, setPlaySession] = useState(null);
  const [playSegmentIndex, setPlaySegmentIndex] = useState(0);
  const [rewardItems, setRewardItems] = useState([]);
  const [stageFloatItems, setStageFloatItems] = useState([]);
  const [showFireworks, setShowFireworks] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: 'demo', password: '123456', displayName: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [parentGateVisible, setParentGateVisible] = useState(false);
  const [parentQuestion, setParentQuestion] = useState(createMathQuestion());
  const [parentAnswerInput, setParentAnswerInput] = useState('');
  const [parentGateError, setParentGateError] = useState('');
  const [parentModeVisible, setParentModeVisible] = useState(false);
  const [parentConfig, setParentConfig] = useState(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState('');
  const [parentDraftTasks, setParentDraftTasks] = useState([]);
  const [parentDraftUsers, setParentDraftUsers] = useState([]);
  const [parentSaveMessage, setParentSaveMessage] = useState('');
  const [parentSaveError, setParentSaveError] = useState('');
  const [parentSaving, setParentSaving] = useState(false);
  const [adoptionVisible, setAdoptionVisible] = useState(false);
  const [starterPets, setStarterPets] = useState([]);
  const [selectedStarterPetCode, setSelectedStarterPetCode] = useState('');
  const [adoptionError, setAdoptionError] = useState('');
  const [claimNextVisible, setClaimNextVisible] = useState(false);
  const [claimNextLoading, setClaimNextLoading] = useState(false);
  const [claimNextError, setClaimNextError] = useState('');
  const [selectedCollectionCode, setSelectedCollectionCode] = useState('');
  const [pendingCollectionResetUserId, setPendingCollectionResetUserId] = useState('');
  const audioContextRef = useRef(null);

  const livePeriod = state?.ui?.currentPeriod || 'morning';
  const period = previewPeriod || livePeriod;
  const theme = PERIOD_THEME[period] || PERIOD_THEME.morning;
  const currentPet = state?.pet || {};
  const currentUser = state?.user || {};
  const groupedTasks = useMemo(() => groupTasks(state?.tasks || []), [state?.tasks]);
  const currentTasks = groupedTasks[activeGroup] || [];
  const totalGoal = (state?.tasks || []).reduce((sum, task) => sum + task.goal, 0) || 1;
  const currentPlaySegment = playSession?.segments?.[playSegmentIndex] || null;
  const currentRoutine = currentPlaySegment?.routine || null;
  const petGallery = useMemo(() => {
    const gallery = state?.petGallery || [];
    const claimed = state?.collection || [];
    if (!gallery.length) return [];

    const claimedCodes = new Set(claimed.map((pet) => pet.code));
    const claimedOrdered = claimed
      .map((pet) => gallery.find((item) => item.code === pet.code))
      .filter(Boolean);
    const unclaimedOrdered = gallery.filter((item) => !claimedCodes.has(item.code));
    return [...claimedOrdered, ...unclaimedOrdered];
  }, [state?.petGallery, state?.collection]);
  const selectedCollectionPet =
    petGallery.find((pet) => pet.code === selectedCollectionCode) ||
    petGallery.find((pet) => pet.isCurrent) ||
    petGallery[0] ||
    null;
  const selectedCollectionIndex = selectedCollectionPet ? petGallery.findIndex((pet) => pet.code === selectedCollectionPet.code) : -1;
  const displayPetLevel = selectedCollectionPet?.isCurrent
    ? currentPet.level || Math.max(1, Number(selectedCollectionPet?.bestLevel || 1))
    : Math.max(1, Number(selectedCollectionPet?.bestLevel || 1));
  const displayPetImagePath =
    selectedCollectionPet?.isUnlocked
      ? selectedCollectionPet?.levels?.find((item) => item.level === displayPetLevel)?.imagePath ||
        selectedCollectionPet?.levels?.find((item) => item.level === Math.max(1, Number(selectedCollectionPet?.bestLevel || 1)))?.imagePath ||
        currentPet.imagePath
      : currentPet.imagePath;
  const displayPetName =
    selectedCollectionPet?.isUnlocked ? selectedCollectionPet.name : currentPet.name || currentUser.petName || '泡泡';
  const displayPetNickname = currentUser.petName || displayPetName || '宠物伙伴';

  function getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    return audioContextRef.current;
  }

  function speakLearningText(text, lang = 'zh-CN') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const content = String(text || '').trim();
    if (!content) return;

    const synth = window.speechSynthesis;
    const utterance = new window.SpeechSynthesisUtterance(content);
    const voices = synth.getVoices();
    const preferredVoice = voices.find((voice) => (voice.lang || '').toLowerCase().startsWith(lang.toLowerCase()));

    utterance.lang = lang;
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = lang === 'en-US' ? 0.88 : 0.82;
    utterance.pitch = lang === 'en-US' ? 1 : 1.02;

    synth.cancel();
    synth.speak(utterance);
  }

  function playSoundEffect(type) {
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const masterGain = context.createGain();
    masterGain.gain.value = 0.14;
    masterGain.connect(context.destination);

    const addTone = ({ frequency, start = 0, duration = 0.2, volume = 0.5, attack = 0.014, decay = 0.2, wave = 'sine', endFrequency = null }) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startAt = now + start;

      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      if (endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
      }
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      createToneEnvelope(gainNode, startAt, volume, attack, decay);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    };

    if (type === 'task-complete') {
      addTone({ frequency: 523.25, start: 0, duration: 0.16, volume: 0.34, wave: 'sine' });
      addTone({ frequency: 659.25, start: 0.1, duration: 0.18, volume: 0.3, wave: 'sine' });
      addTone({ frequency: 783.99, start: 0.2, duration: 0.24, volume: 0.26, decay: 0.26, wave: 'sine' });
      addTone({ frequency: 1046.5, start: 0.24, duration: 0.16, volume: 0.12, decay: 0.18, wave: 'sine' });
      return;
    }

    const soundMap = {
      petting: [
        { frequency: 659.25, duration: 0.12, volume: 0.2, wave: 'sine' },
        { frequency: 880, start: 0.06, duration: 0.14, volume: 0.16, decay: 0.18, wave: 'sine' }
      ],
      playing: [
        { frequency: 440, duration: 0.12, volume: 0.22, wave: 'sine' },
        { frequency: 554.37, start: 0.07, duration: 0.14, volume: 0.18, wave: 'sine' },
        { frequency: 659.25, start: 0.14, duration: 0.18, volume: 0.16, decay: 0.18, wave: 'sine' },
        { frequency: 880, start: 0.18, duration: 0.12, volume: 0.08, decay: 0.12, wave: 'sine' }
      ],
      feeding: [
        { frequency: 349.23, duration: 0.12, volume: 0.18, wave: 'sine' },
        { frequency: 440, start: 0.08, duration: 0.14, volume: 0.15, wave: 'sine' },
        { frequency: 523.25, start: 0.16, duration: 0.16, volume: 0.1, decay: 0.16, wave: 'sine' }
      ],
      studying: [
        { frequency: 392, duration: 0.1, volume: 0.14, wave: 'sine' },
        { frequency: 523.25, start: 0.08, duration: 0.14, volume: 0.12, decay: 0.16, wave: 'sine' }
      ],
      sleeping: [
        { frequency: 293.66, duration: 0.18, volume: 0.1, decay: 0.28, wave: 'sine', endFrequency: 261.63 },
        { frequency: 349.23, start: 0.12, duration: 0.22, volume: 0.08, decay: 0.32, wave: 'sine', endFrequency: 293.66 }
      ]
    };

    (soundMap[type] || []).forEach(addTone);
  }

  async function loadAppState(tokenOverride = null, userId = '') {
    setLoading(true);
    setError('');
    const latest = await requestJson(buildStatePath(userId), {}, tokenOverride);
    setState(latest);
    return latest;
  }

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      setError('');
      setState(null);
      return;
    }

    let cancelled = false;
    loadAppState(null, selectedUserId)
      .then(() => {
        if (cancelled) return;
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, selectedUserId]);

  useEffect(() => {
    if (!rewardItems.length && !showFireworks) return undefined;
    const timer = window.setTimeout(() => {
      setRewardItems([]);
      setShowFireworks(null);
    }, showFireworks ? 5000 : 3200);
    return () => window.clearTimeout(timer);
  }, [rewardItems, showFireworks]);

  useEffect(() => {
    if (!stageFloatItems.length) return undefined;
    const timer = window.setTimeout(() => {
      setStageFloatItems([]);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [stageFloatItems]);

  useEffect(() => {
    if (state?.progression?.canClaimNextPet && state?.progression?.nextPet) {
      setClaimNextVisible(true);
      setClaimNextError('');
      return;
    }
    setClaimNextVisible(false);
  }, [state?.user?.id, state?.progression?.canClaimNextPet, state?.progression?.nextPetCode]);

  useEffect(() => {
    if (!petGallery.length) {
      setSelectedCollectionCode('');
      return;
    }

    const loadedUserId = String(state?.user?.id || '');
    const targetResetUserId = pendingCollectionResetUserId || String(state?.users?.[0]?.id || '');

    if (pendingCollectionResetUserId && loadedUserId === targetResetUserId && state?.pet?.code) {
      setSelectedCollectionCode(state.pet.code);
      setPendingCollectionResetUserId('');
      return;
    }

    if (selectedCollectionCode && petGallery.some((pet) => pet.code === selectedCollectionCode)) {
      return;
    }

    setSelectedCollectionCode(petGallery.find((pet) => pet.isCurrent)?.code || petGallery[0].code);
  }, [petGallery, selectedCollectionCode, pendingCollectionResetUserId, state?.pet?.code, state?.user?.id, state?.users]);

  useEffect(() => {
    if (!playSession || !currentPlaySegment) return undefined;

    const timer = window.setTimeout(() => {
      if (playSegmentIndex >= playSession.segments.length - 1) {
        setIsPlaying(false);
        setPlaySession(null);
        setPlaySegmentIndex(0);
        setInteractionMode('');
        return;
      }

      const nextIndex = playSegmentIndex + 1;
      const nextSegment = playSession.segments[nextIndex];
      setPlaySegmentIndex(nextIndex);
      setRewardItems(createBurstItems(nextSegment.routine.symbols, 10));
      setMessage(
        `${displayPetName || '宠物'} 切到${PLAY_MODE_LABELS[playSession.mode]} · ${nextSegment.note}，正在展示${nextSegment.routine.label}。`
      );
    }, currentPlaySegment.duration);

    return () => window.clearTimeout(timer);
  }, [playSession, playSegmentIndex, currentPlaySegment, displayPetName]);

  useEffect(() => {
    if (!parentConfig) return;
    setParentDraftTasks(
      (parentConfig.tasks || []).map((task) => ({
        ...task,
        id: task.id || `draft-task-${task.group}-${task.title}`
      }))
    );
    setParentDraftUsers(
      (parentConfig.users || []).length
        ? parentConfig.users.map((user) => ({
            id: user.id || null,
            name: user.name || '',
            petName: user.petName || '',
            starterPetCode: user.starterPetCode || parentConfig.petGroups?.[0]?.code || ''
          }))
        : [createBlankUser(parentConfig.petGroups?.[0]?.code || '')]
    );
  }, [parentConfig]);

  useEffect(() => {
    if (!learningPetVisible) return undefined;
    const timer = window.setTimeout(() => {
      setLearningPetVisible(false);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [learningPetVisible]);

  useEffect(() => {
    if (!learningSadVisible) return undefined;
    const timer = window.setTimeout(() => {
      setLearningSadVisible(false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [learningSadVisible]);

  useEffect(() => () => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
  }, []);

  async function openAdoptionFlow(token) {
    const config = await requestJson('/api/config', {}, token);
    setStarterPets(config.petGroups || []);
    setSelectedStarterPetCode('');
    setAdoptionError('');
    setAdoptionVisible(true);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setError('');

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const data = await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      setAuthToken(data.token);
      setAuthTokenState(data.token);
      setSelectedUserId('');
      setPendingCollectionResetUserId('');
      setSelectedCollectionCode('');
      setParentModeVisible(false);
      setAdoptionVisible(false);
      setClaimNextVisible(false);

      if (authMode === 'register') {
        await openAdoptionFlow(data.token);
      } else {
        await loadAppState(data.token, '');
        setMessage('登录成功，欢迎回来。');
      }
    } catch (authError) {
      setError(authError.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleConfirmAdoption() {
    try {
      const latest = await requestJson('/api/onboarding/adopt-starter-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starterPetCode: selectedStarterPetCode })
      });
      setState(latest);
      setAdoptionVisible(false);
      setMessage(`领养成功，${latest.pet.name} 已经准备好和你一起成长。`);
    } catch (adoptError) {
      setAdoptionError(adoptError.message);
    }
  }

  async function handleClaimNextPet() {
    setClaimNextLoading(true);
    setClaimNextError('');
    try {
      const latest = await requestJson(`/api/pets/claim-next${selectedUserId ? `?userId=${selectedUserId}` : ''}`, {
        method: 'POST'
      });
      setState(latest);
      setClaimNextVisible(false);
      setMessage(`新宠物 ${latest.pet.name} 已领取成功，继续开始新的成长旅程。`);
      setRewardItems(createBurstItems(['🎁', '✨', '🌟', '🪄'], 12));
    } catch (claimError) {
      setClaimNextError(claimError.message);
    } finally {
      setClaimNextLoading(false);
    }
  }

  async function handleSelectDisplayedPet(targetPet) {
    setSelectedCollectionCode(targetPet.code);
    if (!targetPet?.isUnlocked) return;

    try {
      const latest = await requestJson(`/api/pets/select-display${selectedUserId ? `?userId=${selectedUserId}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petCode: targetPet.code })
      });
      setState(latest);
      setMessage(`${targetPet.name} 已设为当前展示宠物。`);
      setError('');
    } catch (selectError) {
      setError(selectError.message);
    }
  }

  function handleCollectionSlide(direction) {
    if (!petGallery.length || selectedCollectionIndex < 0) return;
    const nextIndex = (selectedCollectionIndex + direction + petGallery.length) % petGallery.length;
    handleSelectDisplayedPet(petGallery[nextIndex]);
  }

  async function handleLogout() {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore logout transport errors and clear local token anyway
    } finally {
      setAuthToken('');
      setAuthTokenState('');
      setState(null);
      setParentModeVisible(false);
      setAdoptionVisible(false);
      setCurrentView('home');
    }
  }

  function handleOpenLearning() {
    setCurrentView('learning');
    setActiveLearningTab('加减法');
  }

  function handleBackToHome() {
    setCurrentView('home');
  }

  function handleRefreshMathProblems() {
    const nextProblems = createLearningProblems();
    setMathProblems(nextProblems);
    setMathAnswers(createEmptyAnswers(nextProblems));
    setMathCheckedTabs({
      addition: false,
      subtraction: false
    });
    setActiveMathTab(MATH_TABS[0].id);
    setLearningPetVisible(false);
    setLearningSadVisible(false);
  }

  function handleRefreshPinyinPractice() {
    setPinyinPractice(createPinyinPracticeSet());
  }

  function handleRefreshEnglishPractice() {
    setEnglishPractice(createEnglishPracticeSet());
  }

  function handleMathAnswerChange(problemId, value) {
    setMathAnswers((current) => ({ ...current, [problemId]: value }));
    const currentProblem = mathProblems.find((problem) => problem.id === problemId);
    if (currentProblem?.mathTab) {
      setMathCheckedTabs((current) => ({ ...current, [currentProblem.mathTab]: false }));
    }
  }

  function handleCheckMath(mathTab) {
    const visibleMathProblems = mathProblems.filter((problem) => problem.mathTab === mathTab);
    const allAnswered = visibleMathProblems.every((problem) => String(mathAnswers[problem.id] || '').trim() !== '');
    if (!allAnswered) {
      setMathCheckedTabs((current) => ({ ...current, [mathTab]: false }));
      setLearningPetVisible(false);
      setLearningSadVisible(false);
      return;
    }

    setMathCheckedTabs((current) => ({ ...current, [mathTab]: true }));
    const allCorrect = visibleMathProblems.every((problem) => Number(mathAnswers[problem.id]) === problem.answer);
    if (allAnswered && allCorrect) {
      setLearningSadVisible(false);
      setLearningPetVisible(true);
    } else {
      setLearningPetVisible(false);
      setLearningSadVisible(true);
    }
  }

  async function handleCompleteTask(task) {
    try {
      const latest = await requestJson(buildTaskPath(task.id, selectedUserId), { method: 'POST' });
      const completionMessage = `${task.title} 完成一次，${latest.user.name} 的 ${latest.pet.name} 获得了 ${task.rewardPetScore} 成长分。`;
      setState(latest);
      setMessage(completionMessage);
      setError('');
      setRewardItems([]);
      setShowFireworks(createFireworkBursts(14));
      playSoundEffect('task-complete');
    } catch (taskError) {
      setError(taskError.message);
    }
  }

  function handlePetting() {
    setInteractionMode('petting');
    setMessage(`你轻轻摸了摸 ${displayPetName || '宠物'}，它开心地回应你。`);
    setRewardItems(createBurstItems(['💗', '💖', '✨'], 8));
    setStageFloatItems(createFloatItems(['💗', '✨', '💕'], 6));
    playSoundEffect('petting');
    window.setTimeout(() => setInteractionMode(''), 1600);
  }

  function handlePlaying() {
    const session = createPlaySession();
    const firstSegment = session.segments[0];
    setIsPlaying(true);
    setInteractionMode('playing');
    setPlaySession(session);
    setPlaySegmentIndex(0);
    setMessage(`${displayPetName || '宠物'} 开启${PLAY_MODE_LABELS[session.mode]}，${firstSegment.note}先上${firstSegment.routine.label}。`);
    setRewardItems(createBurstItems(firstSegment.routine.symbols, 12));
    playSoundEffect('playing');
  }

  function handleFeeding() {
    setIsPlaying(false);
    setPlaySession(null);
    setPlaySegmentIndex(0);
    setInteractionMode('eating');
    setMessage(`${displayPetName || '宠物'} 正在大口吃饭，头顶已经飘出香喷喷的小蒸汽。`);
    setRewardItems(createBurstItems(['🍎', '🍓', '🥕', '✨'], 10));
    setStageFloatItems(createFloatItems(['🍽️', '🍎', '✨', '🥛'], 8));
    playSoundEffect('feeding');
    window.setTimeout(() => setInteractionMode(''), 4000);
  }

  function handleStudying() {
    setIsPlaying(false);
    setPlaySession(null);
    setPlaySegmentIndex(0);
    setInteractionMode('studying');
    setMessage(`${displayPetName || '宠物'} 打开了学习模式，书页和灵感星星正在身边打转。`);
    setRewardItems(createBurstItems(['📚', '✏️', '⭐', '✨'], 10));
    setStageFloatItems(createFloatItems(['📘', '🧠', '✨', '✏️'], 8));
    playSoundEffect('studying');
    window.setTimeout(() => setInteractionMode(''), 5000);
  }

  function handleSleeping() {
    setIsPlaying(false);
    setPlaySession(null);
    setPlaySegmentIndex(0);
    setInteractionMode('sleeping');
    setMessage(`${displayPetName || '宠物'} 进入了睡觉时间，云朵和星星正在慢慢把它包起来。`);
    setRewardItems(createBurstItems(['🌙', '⭐', '💤', '✨'], 10));
    setStageFloatItems(createFloatItems(['💤', '☁️', '⭐', '🌙'], 8));
    playSoundEffect('sleeping');
    window.setTimeout(() => setInteractionMode(''), 6000);
  }

  async function openParentMode() {
    if (!isParentGateUnlocked()) {
      setParentQuestion(createMathQuestion());
      setParentAnswerInput('');
      setParentGateError('');
      setParentGateVisible(true);
      return;
    }

    setParentLoading(true);
    setParentError('');
    setParentSaveError('');
    setParentSaveMessage('');
    try {
      const config = await requestJson('/api/config');
      setParentConfig(config);
      setParentModeVisible(true);
    } catch (configError) {
      setParentError(configError.message);
    } finally {
      setParentLoading(false);
    }
  }

  async function handleParentGateConfirm() {
    if (Number(parentAnswerInput) !== parentQuestion.answer) {
      setParentQuestion(createMathQuestion());
      setParentAnswerInput('');
      setParentGateError('答案不对，请再算一次。');
      return;
    }

    unlockParentGate();
    setParentGateVisible(false);
    await openParentMode();
  }

  function handleParentTaskChange(taskId, field, value) {
    setParentDraftTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              [field]: field === 'goal' ? Math.max(1, Math.min(5, Number(value) || 1)) : value
            }
          : task
      )
    );
  }

  function handleAddParentTask(group) {
    setParentDraftTasks((current) => [...current, createBlankTask(group)]);
  }

  function handleDeleteParentTask(taskId) {
    setParentDraftTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function handleParentUserChange(index, field, value) {
    setParentDraftUsers((current) =>
      current.map((user, currentIndex) => (currentIndex === index ? { ...user, [field]: value } : user))
    );
  }

  function handleAddParentUser() {
    setParentDraftUsers((current) => [...current, createBlankUser(parentConfig?.petGroups?.[0]?.code || '')]);
  }

  function handleDeleteParentUser(index) {
    setParentDraftUsers((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSaveParentConfig() {
    setParentSaving(true);
    setParentSaveError('');
    setParentSaveMessage('');

    try {
      const payload = {
        tasks: parentDraftTasks.map((task) => ({
          group: task.group,
          title: task.title,
          goal: task.goal
        })),
        users: parentDraftUsers.map((user) => ({
          id: user.id,
          name: user.name,
          petName: user.petName,
          starterPetCode: user.starterPetCode
        }))
      };
      const latestState = await requestJson('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setParentSaveMessage('家长模式配置已保存。');
      setState(latestState);
      const refreshedConfig = await requestJson('/api/config');
      setParentConfig(refreshedConfig);
    } catch (saveError) {
      setParentSaveError(saveError.message);
    } finally {
      setParentSaving(false);
    }
  }

  return (
    <main className={`demo-page theme-${period}`}>
      <RewardOverlay items={rewardItems} fireworks={showFireworks} />
      <ParentGateModal
        visible={parentGateVisible}
        question={parentQuestion}
        answerInput={parentAnswerInput}
        setAnswerInput={setParentAnswerInput}
        error={parentGateError}
        onClose={() => setParentGateVisible(false)}
        onConfirm={handleParentGateConfirm}
      />
      <ParentModePage
        visible={parentModeVisible}
        loading={parentLoading}
        error={parentError}
        config={parentConfig}
        draftTasks={parentDraftTasks}
        draftUsers={parentDraftUsers}
        saveMessage={parentSaveMessage}
        saveError={parentSaveError}
        saving={parentSaving}
        onBack={() => setParentModeVisible(false)}
        onTaskChange={handleParentTaskChange}
        onAddTask={handleAddParentTask}
        onDeleteTask={handleDeleteParentTask}
        onUserChange={handleParentUserChange}
        onAddUser={handleAddParentUser}
        onDeleteUser={handleDeleteParentUser}
        onSave={handleSaveParentConfig}
      />
      <AdoptionModal
        visible={adoptionVisible}
        pets={starterPets}
        selectedPetCode={selectedStarterPetCode}
        onSelect={setSelectedStarterPetCode}
        onConfirm={handleConfirmAdoption}
        error={adoptionError}
      />
      <ClaimNextPetModal
        visible={claimNextVisible}
        nextPet={state?.progression?.nextPet}
        loading={claimNextLoading}
        error={claimNextError}
        onConfirm={handleClaimNextPet}
      />

      {!parentModeVisible ? <section className="demo-shell">
        <header className="demo-topbar">
          <div className="demo-brandmark" aria-label="宠物乐园">
            <span className="demo-brandmark-shadow">宠物乐园</span>
            <strong className="demo-brandmark-title">宠物乐园</strong>
          </div>

          <div className="demo-controls">
            {authToken ? (
              <div className="demo-toolbar">
                <select
                  className="demo-select"
                  value={selectedUserId || String(state?.users?.[0]?.id || '')}
                  onChange={(event) => {
                    setSelectedCollectionCode('');
                    setPendingCollectionResetUserId(event.target.value);
                    setSelectedUserId(event.target.value);
                  }}
                  disabled={!state?.users?.length}
                >
                  {(state?.users || []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.petName}
                    </option>
                  ))}
                </select>
                <button type="button" className="demo-action secondary" onClick={openParentMode}>
                  家长模式
                </button>
                <button type="button" className="demo-action secondary" onClick={handleOpenLearning}>
                  学习入口
                </button>
                <button type="button" className="demo-action" onClick={() => window.location.reload()}>
                  刷新状态
                </button>
                <button type="button" className="demo-action ghost" onClick={handleLogout}>
                  退出登录
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {!authToken ? (
          <section className="demo-empty">
            <div className="demo-auth-tabs">
              <button
                type="button"
                className={`demo-tab${authMode === 'login' ? ' active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                登录
              </button>
              <button
                type="button"
                className={`demo-tab${authMode === 'register' ? ' active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                注册
              </button>
            </div>
            <h2>{authMode === 'register' ? '注册 React 版宠物首页' : '登录 React 版宠物首页'}</h2>
            <p>这个页面会把 token 存到当前 React 站点本地，再通过代理访问主项目 API。</p>
            <form className="demo-auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' ? (
                <input
                  className="demo-input"
                  type="text"
                  placeholder="家庭名称（注册时填写）"
                  value={authForm.displayName}
                  onChange={(event) => setAuthForm((current) => ({ ...current, displayName: event.target.value }))}
                />
              ) : null}
              <input
                className="demo-input"
                type="text"
                placeholder="账号"
                value={authForm.username}
                onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value }))}
              />
              <input
                className="demo-input"
                type="password"
                placeholder="密码"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              />
              <button type="submit" className="demo-action" disabled={authLoading}>
                {authLoading ? '处理中...' : authMode === 'register' ? '注册账号' : '登录账号'}
              </button>
            </form>
            <p className={`demo-status${error ? ' is-error' : ''}`}>{error || '默认演示账号：demo / 123456'}</p>
          </section>
        ) : loading ? (
          <section className="demo-empty">
            <h2>正在读取宠物状态</h2>
            <p>稍等一下，正在同步当前用户和时段背景。</p>
          </section>
        ) : error && !state ? (
          <section className="demo-empty">
            <h2>读取失败</h2>
            <p>{error}</p>
            <p>请确认主项目服务已启动在 `127.0.0.1:5173`。</p>
          </section>
        ) : currentView === 'learning' ? (
          <LearningPage
            activeTab={activeLearningTab}
            onTabChange={setActiveLearningTab}
            activeMathTab={activeMathTab}
            onMathTabChange={setActiveMathTab}
            pinyinPractice={pinyinPractice}
            onRefreshPinyin={handleRefreshPinyinPractice}
            englishPractice={englishPractice}
            onRefreshEnglish={handleRefreshEnglishPractice}
            onSpeakText={speakLearningText}
            mathProblems={mathProblems}
            mathAnswers={mathAnswers}
            mathCheckedTabs={mathCheckedTabs}
            learningPetVisible={learningPetVisible}
            learningSadVisible={learningSadVisible}
            learningPetImagePath={displayPetImagePath}
            learningPetName={displayPetNickname}
            onMathAnswerChange={handleMathAnswerChange}
            onCheckMath={handleCheckMath}
            onRefreshMath={handleRefreshMathProblems}
            onBack={handleBackToHome}
          />
        ) : (
          <>
            <section className="demo-grid">
              <div className="demo-stage-wrap">
                <div className="demo-stage-panel">
                  <div className="demo-stage-head">
                    <div>
                      <p className="demo-card-kicker">互动操作</p>
                      <h2 className="demo-stage-title">{displayPetNickname}</h2>
                    </div>
                    <span className="demo-period-badge">{PERIOD_THEME[livePeriod]?.label || '上午'}</span>
                  </div>

                  <div
                    className={`demo-stage-hero${interactionMode ? ` is-${interactionMode}` : ''}${isPlaying ? ' is-playing' : ''}${playSession ? ` mode-${playSession.mode}` : ''}`}
                  >
                    <TimePetBackground
                      className="demo-stage-background"
                      compact
                      period={period}
                      petName={displayPetName}
                      title={`${theme.label} · ${formatPetRole(period)}`}
                      subtitle={currentPet.hint || theme.subtitle}
                    />
                    {isPlaying ? (
                      <div className="demo-stage-effects" aria-hidden="true">
                        <span className="demo-stage-spotlight spotlight-left" />
                        <span className="demo-stage-spotlight spotlight-right" />
                        <span className="demo-stage-beat beat-a" />
                        <span className="demo-stage-beat beat-b" />
                        <span className="demo-stage-beat beat-c" />
                        <span className="demo-stage-floor" />
                      </div>
                    ) : null}
                    {interactionMode === 'eating' ? (
                      <div className="demo-stage-scene is-eating" aria-hidden="true">
                        <span className="scene-bowl" />
                        <span className="scene-snack snack-a">🍎</span>
                        <span className="scene-snack snack-b">🥕</span>
                        <span className="scene-snack snack-c">🍓</span>
                        <span className="scene-steam steam-a" />
                        <span className="scene-steam steam-b" />
                      </div>
                    ) : null}
                    {interactionMode === 'studying' ? (
                      <div className="demo-stage-scene is-studying" aria-hidden="true">
                        <span className="scene-book" />
                        <span className="scene-pencil pencil-a" />
                        <span className="scene-pencil pencil-b" />
                        <span className="scene-thought thought-a">A+</span>
                        <span className="scene-thought thought-b">1+1</span>
                      </div>
                    ) : null}
                    {interactionMode === 'sleeping' ? (
                      <div className="demo-stage-scene is-sleeping" aria-hidden="true">
                        <span className="scene-cloud cloud-a" />
                        <span className="scene-cloud cloud-b" />
                        <span className="scene-moon" />
                        <span className="scene-sleep-dot dot-a">💤</span>
                        <span className="scene-sleep-dot dot-b">⭐</span>
                      </div>
                    ) : null}
                    {stageFloatItems.length ? (
                      <div className="demo-stage-floats" aria-hidden="true">
                        {stageFloatItems.map((item) => (
                          <span
                            key={item.id}
                            className="demo-stage-float"
                            style={{
                              left: item.left,
                              top: item.top,
                              animationDelay: item.delay,
                              animationDuration: item.duration
                            }}
                          >
                            {item.symbol}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {displayPetImagePath ? (
                      <img
                        className={`demo-stage-pet${isPlaying ? ' performer' : ''}${currentRoutine ? ` motion-${currentRoutine.motion}` : ''}`}
                        src={displayPetImagePath}
                        alt={displayPetName || '宠物'}
                      />
                    ) : (
                      <div className="demo-stage-placeholder">宠物</div>
                    )}
                    <div className="demo-stage-glow" aria-hidden="true" />
                    {currentRoutine ? (
                      <span className="demo-stage-routine-badge">
                        {PLAY_MODE_LABELS[playSession.mode]} · {currentPlaySegment.note} · {currentRoutine.label}
                      </span>
                    ) : null}
                  </div>

                  <div className="demo-stage-actions">
                    <button type="button" className="demo-action large" onClick={handlePetting}>
                      摸摸宠物
                    </button>
                    <button type="button" className="demo-action large secondary" onClick={handlePlaying}>
                      开心玩耍
                    </button>
                    <button type="button" className="demo-action large" onClick={handleFeeding}>
                      吃饭时间
                    </button>
                    <button type="button" className="demo-action large secondary" onClick={handleStudying}>
                      一起学习
                    </button>
                    <button type="button" className="demo-action large ghost" onClick={handleSleeping}>
                      睡觉休息
                    </button>
                  </div>

                  <p className={`demo-status${error ? ' is-error' : ''}`}>{error || message || '从一个简单任务开始，帮助宠物成长。'}</p>
                </div>
              </div>

              <aside className="demo-sidecard">
                <div className="demo-pet-card">
                  <div className="demo-pet-card-head">
                    <button type="button" className="demo-pet-nav" onClick={() => handleCollectionSlide(-1)} disabled={petGallery.length <= 1}>
                      ←
                    </button>
                    <span className="demo-pet-badge">{selectedCollectionPet?.isUnlocked ? (selectedCollectionPet?.isCurrent ? formatPetRole(period) : '已解锁') : '待解锁'}</span>
                    <button type="button" className="demo-pet-nav" onClick={() => handleCollectionSlide(1)} disabled={petGallery.length <= 1}>
                      →
                    </button>
                  </div>
                  <div className={`demo-pet-levels${selectedCollectionPet?.isUnlocked ? '' : ' locked'}`}>
                    {(selectedCollectionPet?.levels || []).map((levelItem) => {
                      const levelUnlocked =
                        Boolean(selectedCollectionPet?.isUnlocked) &&
                        Number(levelItem.level) <= Number(selectedCollectionPet?.bestLevel || 0);

                      return (
                      <article
                        key={`${selectedCollectionPet?.code || 'pet'}-${levelItem.level}`}
                        className={`demo-pet-level-card${levelUnlocked ? '' : ' locked'}`}
                      >
                        <span className="demo-pet-level-tag">Lv.{levelItem.level}</span>
                        {levelItem.imagePath ? <img className="demo-pet-image level-card-image" src={levelItem.imagePath} alt={`${selectedCollectionPet?.name || '宠物'} ${levelItem.level}级`} /> : null}
                        {!levelUnlocked ? <span className="demo-pet-level-hint">加油待解锁</span> : null}
                      </article>
                    )})}
                    {!selectedCollectionPet?.isUnlocked ? <div className="demo-pet-lock-mask">未解锁</div> : null}
                  </div>
                  <div className="demo-pet-page-indicator">
                    {selectedCollectionIndex + 1}/{petGallery.length || 1}
                  </div>
                </div>

                <div className="demo-stats">
                  <article className="demo-stat">
                    <span>心情值</span>
                    <strong>{state.mood || 0}</strong>
                  </article>
                  <article className="demo-stat">
                    <span>星星值</span>
                    <strong>{state.stars || 0}</strong>
                  </article>
                  <article className="demo-stat">
                    <span>今日完成</span>
                    <strong>
                      {state.totalCompleted || 0}/{totalGoal}
                    </strong>
                  </article>
                </div>
              </aside>
            </section>

            <section className="demo-task-shell">
              <div className="demo-task-head">
                <div>
                  <p className="demo-card-kicker">今日任务</p>
                  <h2>今天继续解锁宠物成长</h2>
                </div>
                <strong className="demo-task-counter">今天已完成 {state.totalCompleted || 0} 项</strong>
              </div>

              <div className="demo-tabs task-tabs" role="tablist" aria-label="任务分组">
                {GROUPS.map((group) => (
                  <button
                    key={group}
                    type="button"
                    className={`demo-tab${group === activeGroup ? ' active' : ''}`}
                    onClick={() => setActiveGroup(group)}
                  >
                    {group}
                  </button>
                ))}
              </div>

              <div className="demo-task-list">
                {currentTasks.length > 0 ? (
                  currentTasks.map((task) => {
                    const isDone = task.completedCount >= task.goal;
                    return (
                      <article key={task.id} className={`demo-task-item${isDone ? ' done' : ''}`}>
                        <div className="demo-task-copy">
                          <strong>{task.title}</strong>
                          <span>
                            已完成 {task.completedCount}/{task.goal} 次 · 每次 +{task.rewardPetScore} 成长分
                          </span>
                        </div>
                        <button
                          type="button"
                          className="demo-action"
                          disabled={isDone}
                          onClick={() => handleCompleteTask(task)}
                        >
                          {isDone ? '已完成' : '完成一次'}
                        </button>
                      </article>
                    );
                  })
                ) : (
                  <div className="demo-task-empty">这个分类暂时没有任务，可以去家长模式中设置。</div>
                )}
              </div>
            </section>
          </>
        )}
      </section> : null}
    </main>
  );
}

export default App;

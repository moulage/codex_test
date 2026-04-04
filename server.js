const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 5173);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DB_DEFAULTS = NODE_ENV === 'production'
  ? {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'WangHui@0710',
      name: 'virtual_pet'
    }
  : {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'wanghui',
      name: 'virtual_pet'
    };
const DB_HOST = process.env.DB_HOST || DB_DEFAULTS.host;
const DB_PORT = Number(process.env.DB_PORT || DB_DEFAULTS.port);
const DB_USER = process.env.DB_USER || DB_DEFAULTS.user;
const DB_PASSWORD = process.env.DB_PASSWORD || DB_DEFAULTS.password;
const DB_NAME = process.env.DB_NAME || DB_DEFAULTS.name;
const PET_SCORE_PER_COMPLETION = 10;
const PET_LEVEL_RULES = [
  { level: 1, scoreMin: 0, scoreMax: 199 },
  { level: 2, scoreMin: 200, scoreMax: 499 },
  { level: 3, scoreMin: 500, scoreMax: 999 }
];
const PET_UNLOCK_SCORE = 1000;
const SESSION_TTL_DAYS = 30;

const REACT_DIST_DIR = path.join(__dirname, 'prototype', 'react-app', 'dist');
const LEGACY_STATIC_DIR = path.join(__dirname, 'prototype');
const REACT_DIST_INDEX = path.join(REACT_DIST_DIR, 'index.html');
const HAS_REACT_DIST = fs.existsSync(REACT_DIST_INDEX);

const STATIC_DIRS = {
  '/pet/': path.join(__dirname, 'pet'),
  '/black/': path.join(__dirname, 'black')
};

const defaultTasks = [
  { id: 'habit-wakeup', group: '日常行为习惯', title: '早起', goal: 2 },
  { id: 'habit-brush', group: '日常行为习惯', title: '洗脸刷牙', goal: 2 },
  { id: 'habit-bag', group: '日常行为习惯', title: '整理书包', goal: 1 },
  { id: 'habit-polite', group: '日常行为习惯', title: '有礼貌', goal: 1 },
  { id: 'habit-eat', group: '日常行为习惯', title: '好好吃饭', goal: 1 },
  { id: 'habit-clean', group: '日常行为习惯', title: '清理卫生', goal: 1 },
  { id: 'habit-sleep', group: '日常行为习惯', title: '晚上准时睡觉', goal: 1 },
  { id: 'study-english', group: '学习', title: '英语', goal: 1 },
  { id: 'study-reading', group: '学习', title: '阅读', goal: 1 },
  { id: 'study-literacy', group: '学习', title: '识字', goal: 1 },
  { id: 'study-thinking', group: '学习', title: '思维', goal: 1 },
  { id: 'exercise-jumprope', group: '运动', title: '跳绳', goal: 1 },
  { id: 'exercise-basketball', group: '运动', title: '篮球', goal: 1 },
  { id: 'exercise-running', group: '运动', title: '跑步', goal: 1 },
  { id: 'exercise-badminton', group: '运动', title: '羽毛球', goal: 1 }
];

const defaultUsers = [
  { name: '乐乐', petName: '泡泡', starterPetCode: 'pet-1' },
  { name: '米米', petName: '糯糯', starterPetCode: 'pet-2' },
  { name: '朵朵', petName: '团团', starterPetCode: 'pet-3' }
];
const defaultAccount = {
  username: 'demo',
  password: '123456',
  displayName: '默认家庭'
};

const defaultUiAssets = [
  { key: 'page-background', group: 'page', name: '页面主背景', path: '/black/web_beijing.png', order: 1 },
  { key: 'pet-period-dawn', group: 'pet-period', name: '晨曦', path: '/black/晨曦.png', order: 1 },
  { key: 'pet-period-morning', group: 'pet-period', name: '上午', path: '/black/上午.png', order: 2 },
  { key: 'pet-period-afternoon', group: 'pet-period', name: '下午', path: '/black/下午.png', order: 3 },
  { key: 'pet-period-night', group: 'pet-period', name: '夜晚', path: '/black/夜晚.png', order: 4 }
];

let pool;

function createHealthPayload() {
  return {
    status: 'ok',
    service: 'virtual-pet-prototype',
    host: HOST,
    port: PORT,
    publicBaseUrl: PUBLIC_BASE_URL,
    database: {
      host: DB_HOST,
      port: DB_PORT,
      name: DB_NAME
    },
    timestamp: new Date().toISOString()
  };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function parseRequestUrl(req) {
  return new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getAuthToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function sanitizeAccountName(name) {
  return String(name || '').trim().slice(0, 20);
}

function normalizeTitle(text) {
  return String(text || '').trim().slice(0, 20);
}

function createTaskId(groupKey, title, index) {
  return `${groupKey}-${index}-${Buffer.from(title).toString('hex').slice(0, 8)}`;
}

function normalizeTasks(inputTasks) {
  if (!Array.isArray(inputTasks) || inputTasks.length === 0) {
    return null;
  }

  const normalized = [];
  const groupMap = {
    habits: '日常行为习惯',
    study: '学习',
    exercise: '运动'
  };

  Object.entries(groupMap).forEach(([groupKey, groupName]) => {
    const groupTasks = inputTasks
      .filter((task) => task && task.group === groupName)
      .map((task, index) => {
        const title = normalizeTitle(task.title);
        const goal = Math.max(1, Math.min(5, Number(task.goal) || 1));
        if (!title) return null;
        return {
          id: createTaskId(groupKey, title, index + 1),
          group: groupName,
          title,
          goal
        };
      })
      .filter(Boolean);

    normalized.push(...groupTasks);
  });

  return normalized.length > 0 ? normalized : null;
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypeMap = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  return contentTypeMap[ext] || 'application/octet-stream';
}

function resolveStaticFile(urlPath) {
  if (urlPath.startsWith('/pet/')) {
    const baseDir = STATIC_DIRS['/pet/'];
    const filePath = path.normalize(path.join(baseDir, decodeURIComponent(urlPath.slice('/pet/'.length))));
    if (!filePath.startsWith(baseDir)) return null;
    return filePath;
  }

  if (urlPath.startsWith('/black/')) {
    const baseDir = STATIC_DIRS['/black/'];
    const filePath = path.normalize(path.join(baseDir, decodeURIComponent(urlPath.slice('/black/'.length))));
    if (!filePath.startsWith(baseDir)) return null;
    return filePath;
  }

  if (HAS_REACT_DIST) {
    if (urlPath === '/') {
      return REACT_DIST_INDEX;
    }

    const requestPath = decodeURIComponent(urlPath.replace(/^\//, ''));
    const reactFilePath = path.normalize(path.join(REACT_DIST_DIR, requestPath));
    if (!reactFilePath.startsWith(REACT_DIST_DIR)) return null;

    if (fs.existsSync(reactFilePath) && fs.statSync(reactFilePath).isFile()) {
      return reactFilePath;
    }

    return REACT_DIST_INDEX;
  }

  const requestPath = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath.replace(/^\//, ''));
  const legacyFilePath = path.normalize(path.join(LEGACY_STATIC_DIR, requestPath));
  if (!legacyFilePath.startsWith(LEGACY_STATIC_DIR)) return null;
  return legacyFilePath;
}

function serveStatic(req, res) {
  const requestUrl = parseRequestUrl(req);
  const filePath = resolveStaticFile(requestUrl.pathname);
  if (!filePath) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
}

function readPetAssets() {
  const petDir = path.join(__dirname, 'pet');
  const files = fs.readdirSync(petDir);
  const fileMap = new Map();

  files.forEach((file) => {
    const match = file.match(/^(\d+)-(\d+)\.(png|webp)$/i);
    if (!match) return;

    const [, petIndex, levelNo, ext] = match;
    const key = `${petIndex}-${levelNo}`;
    const current = fileMap.get(key);

    if (!current || current.image_format === 'png') {
      fileMap.set(key, {
        pet_code: `pet-${petIndex}`,
        display_name: `宠物 ${petIndex}`,
        level_no: Number(levelNo),
        image_path: `/pet/${file}`,
        image_format: ext.toLowerCase(),
        sort_order: Number(petIndex)
      });
    }
  });

  return Array.from(fileMap.values()).sort((a, b) => {
    if (a.sort_order === b.sort_order) return a.level_no - b.level_no;
    return a.sort_order - b.sort_order;
  });
}

function getLevelByScore(score) {
  if (score >= PET_LEVEL_RULES[2].scoreMin) return 3;
  if (score >= PET_LEVEL_RULES[1].scoreMin) return 2;
  return 1;
}

function getScoreWithinCurrentPet(score) {
  return Math.max(0, Math.min(PET_UNLOCK_SCORE, score));
}

function buildProgressHint(currentPetScore, currentPetOrder, totalPets) {
  const score = getScoreWithinCurrentPet(currentPetScore);
  if (currentPetOrder >= totalPets && score >= PET_UNLOCK_SCORE) {
    return '当前已经是最后一只宠物的满级状态，成长分封顶 1000。';
  }
  if (score < 200) {
    return `当前宠物 200 分升到 2 级，距离升级还差 ${200 - score} 分。`;
  }
  if (score < 500) {
    return `当前宠物 500 分升到 3 级，距离升级还差 ${500 - score} 分。`;
  }
  if (score < PET_UNLOCK_SCORE) {
    return `当前宠物达到 1000 分可解锁下一只，距离解锁还差 ${PET_UNLOCK_SCORE - score} 分。`;
  }
  return '当前宠物已满级，下一次完成任务会自动切换到下一只可解锁宠物。';
}

function getCurrentPeriod() {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
    }).format(new Date())
  );

  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
}

function getBeijingDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

async function ensureDefaultAccount() {
  const [rows] = await pool.execute('SELECT id FROM accounts WHERE username = ? LIMIT 1', [defaultAccount.username]);
  if (rows[0]?.id) {
    return rows[0].id;
  }
  const [result] = await pool.execute(
    `INSERT INTO accounts (username, password_hash, display_name)
     VALUES (?, ?, ?)`,
    [defaultAccount.username, hashPassword(defaultAccount.password), defaultAccount.displayName]
  );
  return result.insertId;
}

async function initializeDatabase() {
  const rootPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
  });

  await rootPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await rootPool.end();

  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(schemaSql);
  const [progressDateColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'user_task_progress'
       AND COLUMN_NAME = 'progress_date'`,
    [DB_NAME]
  );
  if (progressDateColumns.length === 0) {
    await pool.query('ALTER TABLE user_task_progress ADD COLUMN progress_date DATE NULL AFTER task_id');
    await pool.execute('UPDATE user_task_progress SET progress_date = ? WHERE progress_date IS NULL', [getBeijingDateString()]);
    await pool.query('ALTER TABLE user_task_progress MODIFY COLUMN progress_date DATE NOT NULL');
  }
  const [usersAccountColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'account_id'`,
    [DB_NAME]
  );
  if (usersAccountColumns.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN account_id BIGINT UNSIGNED NULL FIRST');
  }
  const [tasksAccountColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'task_definitions'
       AND COLUMN_NAME = 'account_id'`,
    [DB_NAME]
  );
  if (tasksAccountColumns.length === 0) {
    await pool.query('ALTER TABLE task_definitions ADD COLUMN account_id BIGINT UNSIGNED NULL AFTER id');
  }
  const [petNameColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'pet_name'`,
    [DB_NAME]
  );
  if (petNameColumns.length === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN pet_name VARCHAR(64) NOT NULL DEFAULT '' AFTER display_name");
  }
  const [displayPetCodeColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'display_pet_code'`,
    [DB_NAME]
  );
  if (displayPetCodeColumns.length === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN display_pet_code VARCHAR(64) NULL AFTER current_pet_code");
  }
  const [displayPetOrderColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'display_pet_order'`,
    [DB_NAME]
  );
  if (displayPetOrderColumns.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN display_pet_order INT UNSIGNED NULL AFTER current_pet_order');
  }
  await pool.query(
    `UPDATE users u
     JOIN pet_groups p ON p.pet_code = u.current_pet_code
     SET u.pet_name = p.display_name
     WHERE u.pet_name = ''`
  );
  await pool.query(
    `UPDATE users
     SET display_pet_code = current_pet_code
     WHERE display_pet_code IS NULL OR display_pet_code = ''`
  );
  await pool.query(
    `UPDATE users
     SET display_pet_order = current_pet_order
     WHERE display_pet_order IS NULL OR display_pet_order = 0`
  );
  const defaultAccountId = await ensureDefaultAccount();
  await pool.execute('UPDATE users SET account_id = ? WHERE account_id IS NULL', [defaultAccountId]);
  await pool.execute('UPDATE task_definitions SET account_id = ? WHERE account_id IS NULL', [defaultAccountId]);
  await seedDatabase();
}

async function seedDatabase() {
  const petAssets = readPetAssets();
  const petCodes = [...new Set(petAssets.map((item) => item.pet_code))];
  const defaultAccountId = await ensureDefaultAccount();

  for (const petCode of petCodes) {
    const petEntry = petAssets.find((item) => item.pet_code === petCode);
    await pool.execute(
      `INSERT INTO pet_groups (pet_code, display_name, sort_order)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), sort_order = VALUES(sort_order)`,
      [petCode, petEntry.display_name, petEntry.sort_order]
    );
  }

  for (const asset of petAssets) {
    const levelRule = PET_LEVEL_RULES.find((item) => item.level === asset.level_no);
    await pool.execute(
      `INSERT INTO pet_assets (pet_code, level_no, score_min, score_max, image_path, image_format)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         score_min = VALUES(score_min),
         score_max = VALUES(score_max),
         image_path = VALUES(image_path),
         image_format = VALUES(image_format)`,
      [
        asset.pet_code,
        asset.level_no,
        levelRule.scoreMin,
        levelRule.scoreMax,
        asset.image_path,
        asset.image_format
      ]
    );
  }

  for (const asset of defaultUiAssets) {
    await pool.execute(
      `INSERT INTO ui_assets (asset_key, asset_group, display_name, image_path, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         asset_group = VALUES(asset_group),
         display_name = VALUES(display_name),
         image_path = VALUES(image_path),
         sort_order = VALUES(sort_order)`,
      [asset.key, asset.group, asset.name, asset.path, asset.order]
    );
  }

  const [taskRows] = await pool.execute('SELECT COUNT(*) AS count FROM task_definitions WHERE account_id = ?', [defaultAccountId]);
  if (taskRows[0].count === 0) {
    for (const [index, task] of defaultTasks.entries()) {
      await insertTask(pool, defaultAccountId, task, index + 1);
    }
  } else {
    const [exerciseRows] = await pool.execute(
      "SELECT COUNT(*) AS count FROM task_definitions WHERE account_id = ? AND group_name = '运动'",
      [defaultAccountId]
    );
    if (exerciseRows[0].count === 0) {
      const [sortRows] = await pool.execute('SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM task_definitions WHERE account_id = ?', [defaultAccountId]);
      let sortOrder = Number(sortRows[0].maxSort || 0);
      const exerciseDefaults = defaultTasks.filter((task) => task.group === '运动');
      for (const task of exerciseDefaults) {
        sortOrder += 1;
        await pool.execute(
          `INSERT INTO task_definitions
            (id, account_id, group_name, title, goal, reward_stars, reward_mood, reward_pet_score, sort_order)
           VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)
           ON DUPLICATE KEY UPDATE
            group_name = VALUES(group_name),
            title = VALUES(title),
            goal = VALUES(goal),
            reward_pet_score = VALUES(reward_pet_score)`,
          [buildStoredTaskId(defaultAccountId, task.id), defaultAccountId, task.group, task.title, task.goal, PET_SCORE_PER_COMPLETION, sortOrder]
        );
      }
    }
  }

  const [userRows] = await pool.execute('SELECT COUNT(*) AS count FROM users WHERE account_id = ?', [defaultAccountId]);
  if (userRows[0].count === 0) {
    for (const user of defaultUsers) {
      const [result] = await pool.execute(
        `INSERT INTO users
          (account_id, display_name, pet_name, starter_pet_code, current_pet_code, current_pet_order, current_pet_score, mood, stars, total_completed)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
        [defaultAccountId, user.name, user.petName, user.starterPetCode, user.starterPetCode, getPetOrderByCode(user.starterPetCode, petAssets)]
      );
      await ensureUserCollection(pool, result.insertId, user.starterPetCode, getPetOrderByCode(user.starterPetCode, petAssets), {
        isCurrent: true,
        bestLevel: 1,
        bestScore: 0,
        isMaxLevel: false
      });
    }
  }
}

function getPetOrderByCode(petCode, petAssets) {
  const row = petAssets.find((item) => item.pet_code === petCode);
  return row ? row.sort_order : 1;
}

async function insertTask(connection, accountId, task, sortOrder) {
  await connection.execute(
    `INSERT INTO task_definitions
      (id, account_id, group_name, title, goal, reward_stars, reward_mood, reward_pet_score, sort_order)
     VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
    [buildStoredTaskId(accountId, task.id), accountId, task.group, task.title, task.goal, PET_SCORE_PER_COMPLETION, sortOrder]
  );
}

async function ensureUserCollection(connection, userId, petCode, petOrder, options = {}) {
  await connection.execute(
    `INSERT INTO user_pet_collection
      (user_id, pet_code, pet_order, best_level, best_score, is_current, is_max_level)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      best_level = GREATEST(best_level, VALUES(best_level)),
      best_score = GREATEST(best_score, VALUES(best_score)),
      is_current = VALUES(is_current),
      is_max_level = GREATEST(is_max_level, VALUES(is_max_level))`,
    [
      userId,
      petCode,
      petOrder,
      options.bestLevel || 1,
      options.bestScore || 0,
      options.isCurrent ? 1 : 0,
      options.isMaxLevel ? 1 : 0
    ]
  );
}

async function clearCurrentCollectionFlag(connection, userId) {
  await connection.execute('UPDATE user_pet_collection SET is_current = 0 WHERE user_id = ?', [userId]);
}

async function getAccountByToken(token, connection = pool) {
  if (!token) return null;
  const [rows] = await connection.execute(
    `SELECT s.account_id AS id, a.username, a.display_name AS displayName
     FROM account_sessions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.session_token = ?
       AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function requireAccount(req, res) {
  const token = getAuthToken(req);
  const account = await getAccountByToken(token);
  if (!account) {
    json(res, 401, { message: '请先登录' });
    return null;
  }
  return account;
}

async function getUserIdFromUrl(requestUrl, accountId) {
  const requested = Number(requestUrl.searchParams.get('userId') || 0);
  const [rows] = await pool.execute('SELECT id FROM users WHERE account_id = ? ORDER BY id ASC LIMIT 1', [accountId]);
  const fallbackId = rows[0]?.id || null;
  if (!requested) return fallbackId;
  const [matchRows] = await pool.execute('SELECT id FROM users WHERE id = ? AND account_id = ? LIMIT 1', [requested, accountId]);
  return matchRows[0]?.id || fallbackId;
}

async function loadUsers(accountId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, display_name AS name, pet_name AS petName, starter_pet_code AS starterPetCode, current_pet_code AS currentPetCode
     FROM users
     WHERE account_id = ?
     ORDER BY id ASC`,
    [accountId]
  );
  return rows;
}

function normalizeUsers(inputUsers, petGroups) {
  if (!Array.isArray(inputUsers) || inputUsers.length === 0) {
    return null;
  }

  const allowedPetCodes = new Set(petGroups.map((item) => item.pet_code));
  const normalized = inputUsers
    .map((user, index) => {
      const name = String(user?.name || '').trim().slice(0, 20);
      const petName = String(user?.petName || '').trim().slice(0, 20);
      const starterPetCode = String(user?.starterPetCode || '').trim();
      const id = Number(user?.id || 0) || null;
      if (!name || !petName || !allowedPetCodes.has(starterPetCode)) return null;
      return {
        id,
        name,
        petName,
        starterPetCode,
        order: index + 1
      };
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : null;
}

async function loadPetGroups(connection = pool) {
  const [rows] = await connection.query(
    'SELECT pet_code, display_name, sort_order FROM pet_groups ORDER BY sort_order ASC'
  );
  return rows;
}

async function createInitialRegisteredUser(connection, accountId) {
  const petGroups = await loadPetGroups(connection);
  const starterPet = petGroups[0];
  if (!starterPet) {
    throw new Error('未找到可领养的宠物');
  }

  const [userResult] = await connection.execute(
    `INSERT INTO users
      (account_id, display_name, pet_name, starter_pet_code, current_pet_code, current_pet_order, current_pet_score, mood, stars, total_completed)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
    [accountId, '宝贝', starterPet.display_name, starterPet.pet_code, starterPet.pet_code, starterPet.sort_order]
  );

  await ensureUserCollection(connection, userResult.insertId, starterPet.pet_code, starterPet.sort_order, {
    isCurrent: true,
    bestLevel: 1,
    bestScore: 0,
    isMaxLevel: false
  });

  return userResult.insertId;
}

async function adoptStarterPetForAccount(connection, accountId, starterPetCode) {
  const petGroups = await loadPetGroups(connection);
  const selectedPet = petGroups.find((item) => item.pet_code === starterPetCode);
  if (!selectedPet) {
    throw new Error('请选择有效的初始宠物');
  }

  const [userRows] = await connection.execute(
    `SELECT id
     FROM users
     WHERE account_id = ?
     ORDER BY id ASC
     LIMIT 1`,
    [accountId]
  );
  const userId = userRows[0]?.id;
  if (!userId) {
    throw new Error('当前账号还没有可领养宠物的用户');
  }

  await connection.execute(
    `UPDATE users
     SET pet_name = ?,
         starter_pet_code = ?,
         current_pet_code = ?,
         display_pet_code = ?,
         current_pet_order = ?,
         display_pet_order = ?,
         current_pet_score = 0,
         mood = 0,
         stars = 0,
         total_completed = 0
     WHERE id = ? AND account_id = ?`,
    [selectedPet.display_name, selectedPet.pet_code, selectedPet.pet_code, selectedPet.pet_code, selectedPet.sort_order, selectedPet.sort_order, userId, accountId]
  );
  await connection.execute('DELETE FROM user_task_progress WHERE user_id = ?', [userId]);
  await connection.execute('DELETE FROM user_pet_collection WHERE user_id = ?', [userId]);
  await ensureUserCollection(connection, userId, selectedPet.pet_code, selectedPet.sort_order, {
    isCurrent: true,
    bestLevel: 1,
    bestScore: 0,
    isMaxLevel: false
  });

  return userId;
}

async function claimNextPetForUser(connection, accountId, userId) {
  const [petGroups] = await connection.query('SELECT pet_code, display_name, sort_order FROM pet_groups ORDER BY sort_order ASC');
  const totalPets = petGroups.length;
  const [[userRow]] = await connection.execute(
    `SELECT id, pet_name, current_pet_code, current_pet_order, current_pet_score
     FROM users
     WHERE id = ? AND account_id = ?
     FOR UPDATE`,
    [userId, accountId]
  );

  if (!userRow) {
    throw new Error('未找到对应的用户');
  }

  if (userRow.current_pet_score < PET_UNLOCK_SCORE || userRow.current_pet_order >= totalPets) {
    throw new Error('当前还没有可领取的新宠物');
  }

  const nextPet = petGroups[userRow.current_pet_order];
  if (!nextPet) {
    throw new Error('下一只宠物不存在');
  }

  await clearCurrentCollectionFlag(connection, userId);
  await ensureUserCollection(connection, userId, userRow.current_pet_code, userRow.current_pet_order, {
    isCurrent: false,
    bestLevel: 3,
    bestScore: PET_UNLOCK_SCORE,
    isMaxLevel: true
  });
  await ensureUserCollection(connection, userId, nextPet.pet_code, nextPet.sort_order, {
    isCurrent: true,
    bestLevel: 1,
    bestScore: 0,
    isMaxLevel: false
  });

  await connection.execute(
    `UPDATE users
     SET current_pet_code = ?, display_pet_code = ?, current_pet_order = ?, display_pet_order = ?, current_pet_score = 0
     WHERE id = ? AND account_id = ?`,
    [nextPet.pet_code, nextPet.pet_code, nextPet.sort_order, nextPet.sort_order, userId, accountId]
  );

  return nextPet;
}

async function setDisplayedPetForUser(connection, accountId, userId, petCode) {
  const [[userRow]] = await connection.execute(
    `SELECT id
     FROM users
     WHERE id = ? AND account_id = ?
     LIMIT 1`,
    [userId, accountId]
  );
  if (!userRow) {
    throw new Error('未找到对应的用户');
  }

  const [[collectionRow]] = await connection.execute(
    `SELECT pet_order
     FROM user_pet_collection
     WHERE user_id = ? AND pet_code = ?
     LIMIT 1`,
    [userId, petCode]
  );
  if (!collectionRow) {
    throw new Error('该宠物尚未解锁，不能设为展示宠物');
  }

  await connection.execute(
    `UPDATE users
     SET display_pet_code = ?, display_pet_order = ?
     WHERE id = ? AND account_id = ?`,
    [petCode, collectionRow.pet_order, userId, accountId]
  );
}

async function loadUiAssets(connection = pool) {
  const [rows] = await connection.query(
    'SELECT asset_key, asset_group, display_name, image_path, sort_order FROM ui_assets ORDER BY sort_order ASC'
  );
  return rows;
}

async function refreshDailyTaskProgress(accountId, userId = null, connection = pool) {
  const today = getBeijingDateString();
  const params = [accountId, today];
  let whereClause = 'u.account_id = ? AND (p.progress_date IS NULL OR p.progress_date <> ?)';

  if (userId) {
    whereClause += ' AND u.id = ?';
    params.push(userId);
  }

  await connection.query(
    `DELETE p FROM user_task_progress p
     JOIN users u ON u.id = p.user_id
     WHERE ${whereClause}`,
    params
  );

  return today;
}

function buildTaskProgressKey(groupName, title) {
  return `${groupName}__${title}`;
}

function buildStoredTaskId(accountId, taskId) {
  return `acct-${accountId}-${taskId}`;
}

async function loadState(accountId, userId, connection = pool) {
  const today = await refreshDailyTaskProgress(accountId, userId, connection);
  const [[userRow]] = await connection.execute(
    `SELECT id, account_id, display_name, pet_name, starter_pet_code, current_pet_code, display_pet_code,
            current_pet_order, display_pet_order,
            current_pet_score, mood, stars, total_completed
     FROM users
     WHERE id = ? AND account_id = ?`,
    [userId, accountId]
  );
  if (!userRow) {
    throw new Error('User not found');
  }

  const [taskRows] = await connection.execute(
    `SELECT t.id, t.group_name AS \`group\`, t.title, t.goal,
            COALESCE(p.completed_count, 0) AS completedCount,
            t.reward_stars AS rewardStars,
            t.reward_mood AS rewardMood,
            t.reward_pet_score AS rewardPetScore
     FROM task_definitions t
     LEFT JOIN user_task_progress p ON p.task_id = t.id AND p.user_id = ? AND p.progress_date = ?
     WHERE t.account_id = ?
     ORDER BY t.sort_order ASC, t.created_at ASC`,
    [userId, today, accountId]
  );

  const activePetLevel =
    userRow.current_pet_score >= PET_UNLOCK_SCORE && userRow.current_pet_order >= (await loadPetGroups(connection)).length
      ? 3
      : getLevelByScore(userRow.current_pet_score);
  const displayPetCode = userRow.display_pet_code || userRow.current_pet_code;
  const displayPetOrder = userRow.display_pet_order || userRow.current_pet_order;

  const [assetRows] = await connection.execute(
    `SELECT a.level_no, a.image_path, a.image_format, g.display_name, g.sort_order
     FROM pet_assets a
     JOIN pet_groups g ON g.pet_code = a.pet_code
     WHERE a.pet_code = ? AND a.level_no = ?
     LIMIT 1`,
    [
      displayPetCode,
      displayPetCode === userRow.current_pet_code
        ? activePetLevel
        : (
            await connection.execute(
              `SELECT COALESCE(best_level, 1) AS bestLevel
               FROM user_pet_collection
               WHERE user_id = ? AND pet_code = ?
               LIMIT 1`,
              [userId, displayPetCode]
            )
          )[0][0]?.bestLevel || 1
    ]
  );

  const [collectionRows] = await connection.execute(
    `SELECT c.pet_code AS code, g.display_name AS name, c.pet_order,
            c.best_level AS bestLevel, c.best_score AS bestScore,
            c.is_current AS isCurrent, c.is_max_level AS isMaxLevel
     FROM user_pet_collection c
     JOIN pet_groups g ON g.pet_code = c.pet_code
     WHERE c.user_id = ?
     ORDER BY c.pet_order ASC`,
    [userId]
  );

  const users = await loadUsers(accountId, connection);
  const petGroups = await loadPetGroups(connection);
  const totalPets = petGroups.length;
  const [petGalleryAssetRows] = totalPets
    ? await connection.query(
        `SELECT pet_code, level_no, image_path, image_format
         FROM pet_assets
         WHERE pet_code IN (${petGroups.map(() => '?').join(',')})`,
        petGroups.map((item) => item.pet_code)
      )
    : [[]];
  const collectionMap = new Map(collectionRows.map((item) => [item.code, item]));
  const nextPetGroup = userRow.current_pet_order < totalPets ? petGroups[userRow.current_pet_order] : null;
  const [nextPetAssets] =
    nextPetGroup
      ? await connection.execute(
          `SELECT image_path, image_format
           FROM pet_assets
           WHERE pet_code = ? AND level_no = 1
           LIMIT 1`,
          [nextPetGroup.pet_code]
        )
      : [[]];
  const uiAssets = await loadUiAssets(connection);
  const nextPetAsset = nextPetAssets[0];
  const currentPetAsset = assetRows[0];
  const currentPeriod = getCurrentPeriod();
  const backgroundAssets = {
    page: uiAssets.find((item) => item.asset_key === 'page-background')?.image_path || '',
    petPeriods: {
      dawn: uiAssets.find((item) => item.asset_key === 'pet-period-dawn')?.image_path || '',
      morning: uiAssets.find((item) => item.asset_key === 'pet-period-morning')?.image_path || '',
      afternoon: uiAssets.find((item) => item.asset_key === 'pet-period-afternoon')?.image_path || '',
      night: uiAssets.find((item) => item.asset_key === 'pet-period-night')?.image_path || ''
    }
  };
  const dailyCompletedCount = taskRows.reduce((sum, task) => sum + Number(task.completedCount || 0), 0);

  return {
    user: {
      id: userRow.id,
      name: userRow.display_name,
      petName: userRow.pet_name,
      starterPetCode: userRow.starter_pet_code
    },
    users,
    mood: userRow.mood,
    stars: userRow.stars,
    totalCompleted: dailyCompletedCount,
    tasks: taskRows,
    pet: {
      code: displayPetCode,
      defaultName: currentPetAsset?.display_name || displayPetCode,
      name: displayPetCode === userRow.current_pet_code ? userRow.pet_name || currentPetAsset?.display_name || displayPetCode : currentPetAsset?.display_name || displayPetCode,
      order: displayPetOrder,
      level: displayPetCode === userRow.current_pet_code ? activePetLevel : Math.min(3, Number(collectionMap.get(displayPetCode)?.bestLevel || 1)),
      score: displayPetCode === userRow.current_pet_code ? getScoreWithinCurrentPet(userRow.current_pet_score) : Math.min(PET_UNLOCK_SCORE, Number(collectionMap.get(displayPetCode)?.bestScore || 0)),
      totalScoreToUnlock: PET_UNLOCK_SCORE,
      imagePath: currentPetAsset?.image_path || '',
      format: currentPetAsset?.image_format || 'webp',
      hint: buildProgressHint(userRow.current_pet_score, userRow.current_pet_order, totalPets)
    },
    collection: collectionRows.map((item) => ({
      ...item,
      imagePath:
        petGalleryAssetRows.find(
          (asset) => asset.pet_code === item.code && asset.level_no === Math.min(Number(item.bestLevel || 1), 3)
        )?.image_path ||
        petGalleryAssetRows.find((asset) => asset.pet_code === item.code && asset.level_no === 1)?.image_path ||
        '',
      format:
        petGalleryAssetRows.find(
          (asset) => asset.pet_code === item.code && asset.level_no === Math.min(Number(item.bestLevel || 1), 3)
        )?.image_format ||
        petGalleryAssetRows.find((asset) => asset.pet_code === item.code && asset.level_no === 1)?.image_format ||
        'webp',
      isCurrent: Boolean(item.isCurrent),
      isMaxLevel: Boolean(item.isMaxLevel)
    })),
    petGallery: petGroups.map((group) => {
      const collected = collectionMap.get(group.pet_code);
      return {
        code: group.pet_code,
        name: group.display_name,
        order: group.sort_order,
        isUnlocked: Boolean(collected),
        isCurrent: group.pet_code === displayPetCode,
        bestLevel: Number(collected?.bestLevel || 0),
        bestScore: Number(collected?.bestScore || 0),
        isMaxLevel: Boolean(collected?.isMaxLevel),
        levels: [1, 2, 3].map((level) => ({
          level,
          imagePath:
            petGalleryAssetRows.find((asset) => asset.pet_code === group.pet_code && asset.level_no === level)?.image_path || '',
          format:
            petGalleryAssetRows.find((asset) => asset.pet_code === group.pet_code && asset.level_no === level)?.image_format || 'webp'
        }))
      };
    }),
    progression: {
      totalPets,
      unlockedCount: collectionRows.length,
      nextPetCode: nextPetGroup?.pet_code || null,
      canClaimNextPet: Boolean(nextPetGroup && userRow.current_pet_score >= PET_UNLOCK_SCORE),
      nextPet: nextPetGroup
        ? {
            code: nextPetGroup.pet_code,
            name: nextPetGroup.display_name,
            order: nextPetGroup.sort_order,
            previewImagePath: nextPetAsset?.image_path || '',
            previewFormat: nextPetAsset?.image_format || 'webp'
          }
        : null
    },
    ui: {
      currentPeriod,
      backgrounds: backgroundAssets
    }
  };
}

async function resetUserProgress(accountId, userId, connection = pool) {
  const [[userRow]] = await connection.execute(
    'SELECT starter_pet_code FROM users WHERE id = ? AND account_id = ?',
    [userId, accountId]
  );
  const [petRows] = await connection.execute(
    'SELECT sort_order FROM pet_groups WHERE pet_code = ?',
    [userRow.starter_pet_code]
  );
  const starterPetOrder = petRows[0].sort_order;

  await connection.execute(
    `UPDATE users
     SET current_pet_code = starter_pet_code,
         display_pet_code = starter_pet_code,
         current_pet_order = ?,
         display_pet_order = ?,
         current_pet_score = 0,
         mood = 0,
         stars = 0,
         total_completed = 0
     WHERE id = ?`,
    [starterPetOrder, starterPetOrder, userId]
  );
  await connection.execute('DELETE FROM user_task_progress WHERE user_id = ?', [userId]);
  await connection.execute('DELETE FROM user_pet_collection WHERE user_id = ?', [userId]);
  await ensureUserCollection(connection, userId, userRow.starter_pet_code, starterPetOrder, {
    isCurrent: true,
    bestLevel: 1,
    bestScore: 0,
    isMaxLevel: false
  });
}

async function advancePetProgress(connection, userRow, petRewardScore) {
  const [petGroups] = await connection.query(
    'SELECT pet_code, sort_order FROM pet_groups ORDER BY sort_order ASC'
  );
  const totalPets = petGroups.length;
  let currentPetOrder = userRow.current_pet_order;
  let currentPetCode = userRow.current_pet_code;
  let currentPetScore = Math.min(userRow.current_pet_score + petRewardScore, PET_UNLOCK_SCORE);

  if (currentPetScore >= PET_UNLOCK_SCORE && currentPetOrder < totalPets) {
    await clearCurrentCollectionFlag(connection, userRow.id);
    await ensureUserCollection(connection, userRow.id, currentPetCode, currentPetOrder, {
      isCurrent: true,
      bestLevel: 3,
      bestScore: PET_UNLOCK_SCORE,
      isMaxLevel: true
    });

    await connection.execute(
      `UPDATE users
       SET current_pet_code = ?, current_pet_order = ?, current_pet_score = ?
       WHERE id = ?`,
      [currentPetCode, currentPetOrder, PET_UNLOCK_SCORE, userRow.id]
    );
    return;
  }

  await clearCurrentCollectionFlag(connection, userRow.id);
  await ensureUserCollection(connection, userRow.id, currentPetCode, currentPetOrder, {
    isCurrent: true,
    bestLevel: currentPetScore >= PET_UNLOCK_SCORE ? 3 : getLevelByScore(currentPetScore),
    bestScore: Math.min(currentPetScore, PET_UNLOCK_SCORE),
    isMaxLevel: currentPetScore >= PET_UNLOCK_SCORE
  });

  await connection.execute(
    `UPDATE users
     SET current_pet_code = ?, current_pet_order = ?, current_pet_score = ?
     WHERE id = ?`,
    [currentPetCode, currentPetOrder, currentPetScore, userRow.id]
  );
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return json(res, 400, { message: 'Bad request' });

  const requestUrl = parseRequestUrl(req);

  try {
    if (req.method === 'GET' && (requestUrl.pathname === '/healthz' || requestUrl.pathname === '/api/healthz')) {
      return json(res, 200, createHealthPayload());
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/auth/register') {
      const body = await parseBody(req);
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      const displayName = sanitizeAccountName(body.displayName || username);
      if (!username || !password) {
        return json(res, 400, { message: '请输入账号和密码' });
      }
      const [existingRows] = await pool.execute('SELECT id FROM accounts WHERE username = ? LIMIT 1', [username]);
      if (existingRows.length > 0) {
        return json(res, 409, { message: '账号已存在' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [accountResult] = await connection.execute(
          'INSERT INTO accounts (username, password_hash, display_name) VALUES (?, ?, ?)',
          [username, hashPassword(password), displayName]
        );
        const accountId = accountResult.insertId;
        for (const [index, task] of defaultTasks.entries()) {
          await insertTask(connection, accountId, task, index + 1);
        }
        await createInitialRegisteredUser(connection, accountId);
        const token = createSessionToken();
        await connection.execute(
          `INSERT INTO account_sessions (account_id, session_token, expires_at)
           VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
          [accountId, token, SESSION_TTL_DAYS]
        );
        await connection.commit();
        return json(res, 201, {
          token,
          account: { id: accountId, username, displayName }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/auth/login') {
      const body = await parseBody(req);
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      const [rows] = await pool.execute(
        'SELECT id, username, display_name AS displayName, password_hash FROM accounts WHERE username = ? LIMIT 1',
        [username]
      );
      const account = rows[0];
      if (!account || account.password_hash !== hashPassword(password)) {
        return json(res, 401, { message: '账号或密码错误' });
      }
      const token = createSessionToken();
      await pool.execute(
        `INSERT INTO account_sessions (account_id, session_token, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [account.id, token, SESSION_TTL_DAYS]
      );
      return json(res, 200, {
        token,
        account: { id: account.id, username: account.username, displayName: account.displayName }
      });
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/auth/logout') {
      const token = getAuthToken(req);
      if (token) {
        await pool.execute('DELETE FROM account_sessions WHERE session_token = ?', [token]);
      }
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/auth/me') {
      const account = await requireAccount(req, res);
      if (!account) return;
      return json(res, 200, { account });
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      const account = await requireAccount(req, res);
      if (!account) return;

      if (req.method === 'POST' && requestUrl.pathname === '/api/onboarding/adopt-starter-pet') {
        const body = await parseBody(req);
        const starterPetCode = String(body.starterPetCode || '').trim();
        if (!starterPetCode) {
          return json(res, 400, { message: '请选择想领养的初始宠物' });
        }

        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          const userId = await adoptStarterPetForAccount(connection, account.id, starterPetCode);
          await connection.commit();
          return json(res, 200, await loadState(account.id, userId, connection));
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/pets/claim-next') {
        const userId = await getUserIdFromUrl(requestUrl, account.id);
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          await claimNextPetForUser(connection, account.id, userId);
          await connection.commit();
          return json(res, 200, await loadState(account.id, userId, connection));
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/pets/select-display') {
        const userId = await getUserIdFromUrl(requestUrl, account.id);
        const body = await parseBody(req);
        const petCode = String(body.petCode || '').trim();
        if (!petCode) {
          return json(res, 400, { message: '请选择要展示的宠物' });
        }

        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          await setDisplayedPetForUser(connection, account.id, userId, petCode);
          await connection.commit();
          return json(res, 200, await loadState(account.id, userId, connection));
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }

    if (req.method === 'GET' && requestUrl.pathname === '/api/state') {
      const userId = await getUserIdFromUrl(requestUrl, account.id);
      return json(res, 200, await loadState(account.id, userId));
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/config') {
      const userId = await getUserIdFromUrl(requestUrl, account.id);
      const state = await loadState(account.id, userId);
      const petGroups = await loadPetGroups();
      const petAssets = readPetAssets();
      const uiAssets = await loadUiAssets();
      return json(res, 200, {
        tasks: state.tasks.map((task) => ({
          group: task.group,
          title: task.title,
          goal: task.goal,
          rewardPetScore: task.rewardPetScore
        })),
        users: state.users,
        currentUser: state.user,
        account,
        petGroups: petGroups.map((item) => ({
          code: item.pet_code,
          name: item.display_name,
          order: item.sort_order,
          previewImagePath:
            petAssets.find((asset) => asset.pet_code === item.pet_code && asset.level_no === 1)?.image_path || '',
          previewFormat:
            petAssets.find((asset) => asset.pet_code === item.pet_code && asset.level_no === 1)?.image_format || 'webp'
        })),
        uiAssets: uiAssets.map((item) => ({
          key: item.asset_key,
          group: item.asset_group,
          name: item.display_name,
          path: item.image_path,
          order: item.sort_order
        }))
      });
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/reset') {
      const userId = await getUserIdFromUrl(requestUrl, account.id);
      await resetUserProgress(account.id, userId);
      return json(res, 200, await loadState(account.id, userId));
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/config') {
      const body = await parseBody(req);
      const tasks = normalizeTasks(body.tasks);
      const petGroups = await loadPetGroups();
      const users = normalizeUsers(body.users, petGroups);
      if (!tasks) {
        return json(res, 400, { message: '请至少设置一个任务' });
      }
      if (!users) {
        return json(res, 400, { message: '请至少设置一个用户并选择起始宠物' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [existingUsers] = await connection.query(
          `SELECT id, display_name, pet_name, starter_pet_code, current_pet_code, current_pet_order,
                  current_pet_score, mood, stars, total_completed
           FROM users
           WHERE account_id = ?`,
          [account.id]
        );
        const existingUserMap = new Map(existingUsers.map((user) => [user.id, user]));
        const preservedUserIds = new Set(users.map((user) => user.id).filter(Boolean));

        const [progressRows] = await connection.query(
          `SELECT p.user_id, t.group_name, t.title, p.completed_count
           FROM user_task_progress p
           JOIN task_definitions t ON t.id = p.task_id
           JOIN users u ON u.id = p.user_id
           WHERE u.account_id = ? AND t.account_id = ?
             AND p.progress_date = ?`,
          [account.id, account.id, getBeijingDateString()]
        );
        const progressMap = new Map();
        progressRows.forEach((row) => {
          if (!progressMap.has(row.user_id)) {
            progressMap.set(row.user_id, new Map());
          }
          progressMap.get(row.user_id).set(buildTaskProgressKey(row.group_name, row.title), row.completed_count);
        });

        const userIdsToDelete = existingUsers
          .map((user) => user.id)
          .filter((id) => !preservedUserIds.has(id));

        if (userIdsToDelete.length > 0) {
          await connection.query(`DELETE FROM users WHERE account_id = ? AND id IN (${userIdsToDelete.map(() => '?').join(',')})`, [account.id, ...userIdsToDelete]);
        }

        await connection.query(
          `DELETE p FROM user_task_progress p
           JOIN users u ON u.id = p.user_id
           WHERE u.account_id = ?`,
          [account.id]
        );
        await connection.query('DELETE FROM task_definitions WHERE account_id = ?', [account.id]);

        const insertedTasks = [];
        for (const [index, task] of tasks.entries()) {
          await insertTask(connection, account.id, task, index + 1);
          insertedTasks.push(task);
        }

        const [newTaskRows] = await connection.query(
          'SELECT id, group_name, title FROM task_definitions WHERE account_id = ?',
          [account.id]
        );
        const taskMap = new Map(
          newTaskRows.map((task) => [buildTaskProgressKey(task.group_name, task.title), task.id])
        );

        for (const user of users) {
          const petOrder = petGroups.find((item) => item.pet_code === user.starterPetCode)?.sort_order || user.order;
          if (user.id && existingUserMap.has(user.id)) {
            await connection.execute(
              `UPDATE users
               SET display_name = ?, pet_name = ?, starter_pet_code = ?
               WHERE id = ? AND account_id = ?`,
              [user.name, user.petName, user.starterPetCode, user.id, account.id]
            );
          } else {
            const [result] = await connection.execute(
              `INSERT INTO users
                (account_id, display_name, pet_name, starter_pet_code, current_pet_code, current_pet_order, current_pet_score, mood, stars, total_completed)
               VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
              [account.id, user.name, user.petName, user.starterPetCode, user.starterPetCode, petOrder]
            );
            user.id = result.insertId;
            await ensureUserCollection(connection, result.insertId, user.starterPetCode, petOrder, {
              isCurrent: true,
              bestLevel: 1,
              bestScore: 0,
              isMaxLevel: false
            });
          }

          const storedProgress = progressMap.get(user.id);
          if (!storedProgress) {
            continue;
          }

          for (const [progressKey, completedCount] of storedProgress.entries()) {
            const nextTaskId = taskMap.get(progressKey);
            if (!nextTaskId) continue;
            await connection.execute(
              `INSERT INTO user_task_progress (user_id, task_id, progress_date, completed_count)
               VALUES (?, ?, ?, ?)`,
              [user.id, nextTaskId, getBeijingDateString(), completedCount]
            );
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

      const userId = await getUserIdFromUrl(requestUrl, account.id);
      return json(res, 200, await loadState(account.id, userId));
    }

    if (req.method === 'POST' && requestUrl.pathname.startsWith('/api/tasks/')) {
      const userId = await getUserIdFromUrl(requestUrl, account.id);
      const segments = requestUrl.pathname.split('/').filter(Boolean);
      const taskId = segments[2];
      if (segments[3] !== 'complete' || !taskId) {
        return json(res, 404, { message: 'Route not found' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const today = await refreshDailyTaskProgress(account.id, userId, connection);
        const [[userRow]] = await connection.execute(
          `SELECT id, account_id, current_pet_code, current_pet_order, current_pet_score
           FROM users
           WHERE id = ? AND account_id = ?
           FOR UPDATE`,
          [userId, account.id]
        );
        const [[task]] = await connection.execute(
          'SELECT id, goal, reward_stars, reward_mood, reward_pet_score FROM task_definitions WHERE id = ? AND account_id = ?',
          [taskId, account.id]
        );
        if (!task) {
          await connection.rollback();
          return json(res, 404, { message: 'Task not found' });
        }

        const [[progress]] = await connection.execute(
          `SELECT completed_count
           FROM user_task_progress
           WHERE user_id = ? AND task_id = ?
             AND progress_date = ?
           FOR UPDATE`,
          [userId, taskId, today]
        );
        const completedCount = progress?.completed_count || 0;
        if (completedCount >= task.goal) {
          await connection.rollback();
          return json(res, 409, { message: 'Task already completed', state: await loadState(account.id, userId) });
        }

        await connection.execute(
          `INSERT INTO user_task_progress (user_id, task_id, progress_date, completed_count)
           VALUES (?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
             progress_date = VALUES(progress_date),
             completed_count = completed_count + 1`,
          [userId, taskId, today]
        );
        await connection.execute(
          `UPDATE users
           SET total_completed = total_completed + 1,
               stars = stars + ?,
               mood = LEAST(100, mood + ?)
           WHERE id = ?`,
          [task.reward_stars, task.reward_mood, userId]
        );
        await advancePetProgress(connection, userRow, task.reward_pet_score);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

      return json(res, 200, await loadState(account.id, userId));
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      return json(res, 404, { message: 'API route not found' });
    }
    }

    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return json(res, 500, { message: '服务器处理失败', detail: error.message });
  }
});

async function bootstrap() {
  await initializeDatabase();
  server.listen(PORT, HOST, () => {
    console.log(`Virtual pet app running at ${PUBLIC_BASE_URL} (bind ${HOST}:${PORT})`);
    console.log(`MySQL connected: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap app:', error);
  process.exit(1);
});

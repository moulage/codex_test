const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5173);

const defaultState = {
  mood: 50,
  stars: 0,
  tasks: [
    { id: 't1', title: '刷牙洗脸', stars: 8, done: false },
    { id: 't2', title: '整理书包', stars: 6, done: false },
    { id: 't3', title: '识字练习 5 分钟', stars: 10, done: false }
  ]
};

let state = JSON.parse(JSON.stringify(defaultState));

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
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
  });
}

function serveStatic(req, res) {
  let filePath = path.join(__dirname, 'prototype', req.url === '/' ? 'index.html' : req.url);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(path.join(__dirname, 'prototype'))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ext = path.extname(filePath);
    const contentTypeMap = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8'
    };

    res.writeHead(200, { 'Content-Type': contentTypeMap[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return json(res, 400, { message: 'Bad request' });

  if (req.method === 'GET' && req.url === '/api/state') {
    return json(res, 200, state);
  }

  if (req.method === 'POST' && req.url === '/api/reset') {
    state = JSON.parse(JSON.stringify(defaultState));
    return json(res, 200, state);
  }

  if (req.method === 'POST' && req.url.startsWith('/api/tasks/')) {
    const segments = req.url.split('/').filter(Boolean);
    const taskId = segments[2];
    if (segments[3] !== 'complete' || !taskId) {
      return json(res, 404, { message: 'Route not found' });
    }

    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return json(res, 404, { message: 'Task not found' });
    if (task.done) return json(res, 409, { message: 'Task already completed', state });

    task.done = true;
    state.stars += task.stars;
    state.mood = Math.min(100, state.mood + 5);
    return json(res, 200, state);
  }

  if (req.url.startsWith('/api/')) {
    return json(res, 404, { message: 'API route not found' });
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Virtual pet app running at http://localhost:${PORT}`);
});

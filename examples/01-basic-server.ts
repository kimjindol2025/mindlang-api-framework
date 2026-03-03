/**
 * 예제 1: 기본 REST API 서버
 */

import { MindLangServer } from '../src/server';
import { Database } from 'mindlang-stdlib/database';

// 서버 생성
const server = new MindLangServer({
  port: 3000,
  hostname: 'localhost',
  cors: true,
});

// 라우트 정의
server.get('/api/health', async (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

server.get('/api/hello', async (req, res) => {
  const name = req.query.name || 'World';
  res.json({ message: `Hello, ${name}!` });
});

server.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  res.json({
    id: userId,
    name: 'John Doe',
    email: `user${userId}@example.com`,
  });
});

server.post('/api/echo', async (req, res) => {
  res.json({ echo: req.body });
});

// 서버 시작
async function main() {
  await server.start();
  console.log('✅ Server running on http://localhost:3000');
}

main().catch(console.error);

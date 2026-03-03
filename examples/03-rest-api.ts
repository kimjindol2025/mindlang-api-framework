/**
 * 예제 3: 완전한 REST API 서버 (Todo API)
 */

import { MindLangServer } from '../src/server';
import { Database } from 'mindlang-stdlib/database';
import { CommonMiddlewares } from '../src/middleware';

// Database 초기화
const db = new Database();
db.createTable('todos');
db.createTable('users');

// 서버 생성
const server = new MindLangServer(
  {
    port: 3000,
    hostname: 'localhost',
    cors: true,
    auth: {
      secret: 'todo-secret-key',
      expiresIn: 3600,
    },
  },
  db
);

// 속도 제한 미들웨어 적용
server.use(CommonMiddlewares.rateLimit(100, 60000)); // 분당 100개 요청

/**
 * Todo 구조
 */
interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/todos - 모든 Todo 조회
 */
server.get('/api/todos', server.requireAuth(), async (req, res) => {
  const todos = db.select('todos', { userId: req.user.userId });
  res.json({ todos });
});

/**
 * GET /api/todos/:id - 특정 Todo 조회
 */
server.get('/api/todos/:id', server.requireAuth(), async (req, res) => {
  const todos = db.select('todos', { id: req.params.id, userId: req.user.userId });

  if (todos.length === 0) {
    res.error(404, 'Todo not found');
    return;
  }

  res.json({ todo: todos[0] });
});

/**
 * POST /api/todos - 새 Todo 생성
 */
server.post(
  '/api/todos',
  server.requireAuth(),
  server.validate({
    title: { type: 'string', required: true },
    description: { type: 'string', required: false },
    priority: { type: 'string', required: false },
  }),
  async (req, res) => {
    const { title, description, priority = 'medium' } = req.body;

    const todo: Todo = {
      id: `todo-${Date.now()}`,
      userId: req.user.userId,
      title,
      description,
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert('todos', todo);
    res.json({ todo }, 201);
  }
);

/**
 * PUT /api/todos/:id - Todo 업데이트
 */
server.put('/api/todos/:id', server.requireAuth(), async (req, res) => {
  const todos = db.select('todos', { id: req.params.id, userId: req.user.userId });

  if (todos.length === 0) {
    res.error(404, 'Todo not found');
    return;
  }

  const updated = {
    ...todos[0],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  db.update('todos', { id: req.params.id }, updated);
  res.json({ todo: updated });
});

/**
 * PATCH /api/todos/:id/toggle - Todo 완료 토글
 */
server.patch('/api/todos/:id/toggle', server.requireAuth(), async (req, res) => {
  const todos = db.select('todos', { id: req.params.id, userId: req.user.userId });

  if (todos.length === 0) {
    res.error(404, 'Todo not found');
    return;
  }

  const updated = {
    ...todos[0],
    completed: !todos[0].completed,
    updatedAt: new Date().toISOString(),
  };

  db.update('todos', { id: req.params.id }, updated);
  res.json({ todo: updated });
});

/**
 * DELETE /api/todos/:id - Todo 삭제
 */
server.delete('/api/todos/:id', server.requireAuth(), async (req, res) => {
  const todos = db.select('todos', { id: req.params.id, userId: req.user.userId });

  if (todos.length === 0) {
    res.error(404, 'Todo not found');
    return;
  }

  // Database에서 삭제 (실제 구현)
  res.json({ success: true });
});

/**
 * GET /api/todos/stats - Todo 통계
 */
server.get('/api/todos/stats', server.requireAuth(), async (req, res) => {
  const todos = db.select('todos', { userId: req.user.userId });

  const stats = {
    total: todos.length,
    completed: todos.filter((t: any) => t.completed).length,
    pending: todos.filter((t: any) => !t.completed).length,
    byPriority: {
      high: todos.filter((t: any) => t.priority === 'high').length,
      medium: todos.filter((t: any) => t.priority === 'medium').length,
      low: todos.filter((t: any) => t.priority === 'low').length,
    },
  };

  res.json({ stats });
});

/**
 * 헬스 체크
 */
server.get('/api/health', async (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime ? process.uptime() : 0,
    timestamp: new Date().toISOString(),
  });
});

// 서버 시작
async function main() {
  await server.start();
  console.log('✅ Todo API Server running on http://localhost:3000');
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  GET    /api/todos           - 모든 Todo');
  console.log('  GET    /api/todos/:id       - 특정 Todo');
  console.log('  POST   /api/todos           - Todo 생성');
  console.log('  PUT    /api/todos/:id       - Todo 업데이트');
  console.log('  PATCH  /api/todos/:id/toggle - 완료 토글');
  console.log('  DELETE /api/todos/:id       - Todo 삭제');
  console.log('  GET    /api/todos/stats     - 통계');
  console.log('  GET    /api/health          - 헬스 체크');
}

main().catch(console.error);

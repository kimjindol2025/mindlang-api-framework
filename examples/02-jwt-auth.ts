/**
 * 예제 2: JWT 인증 서버
 */

import { MindLangServer } from '../src/server';
import { UserAuthService } from '../src/auth';
import { Database } from 'mindlang-stdlib/database';

// Database 초기화
const db = new Database();
db.createTable('users');

// 서버 생성 (인증 활성화)
const server = new MindLangServer(
  {
    port: 3000,
    hostname: 'localhost',
    cors: true,
    auth: {
      secret: 'your-secret-key-change-in-production',
      expiresIn: 3600, // 1시간
    },
  },
  db
);

// 사용자 관리 서비스
const authService = server.getAuthService()!;
const userService = new UserAuthService(db, authService);

/**
 * 회원가입
 */
server.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.error(400, 'Email, password, and name are required');
      return;
    }

    const user = await userService.register(email, password, name);
    res.json({ success: true, user }, 201);
  } catch (error: any) {
    res.error(400, error.message);
  }
});

/**
 * 로그인
 */
server.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.error(400, 'Email and password are required');
      return;
    }

    const result = await userService.login(email, password);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.error(401, error.message);
  }
});

/**
 * 현재 사용자 정보 (인증 필수)
 */
server.get('/api/auth/me', server.requireAuth(), async (req, res) => {
  res.json({
    id: req.user.userId,
    email: req.user.email,
    role: req.user.role,
  });
});

/**
 * 토큰 검증
 */
server.post('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.error(400, 'Token is required');
      return;
    }

    const payload = await authService.verify(token);
    res.json({ valid: true, payload });
  } catch (error: any) {
    res.error(400, 'Invalid token');
  }
});

/**
 * 공개 엔드포인트
 */
server.get('/api/public', async (req, res) => {
  res.json({ message: 'This is public' });
});

/**
 * 사용자만 접근 가능
 */
server.get('/api/users/profile', server.requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const users = db.select('users', { id: userId });

  if (users.length === 0) {
    res.error(404, 'User not found');
    return;
  }

  const user = users[0];
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  });
});

/**
 * 관리자만 접근 가능
 */
server.get('/api/admin/users', server.requireAuth(), server.requireRole(['admin']), async (req, res) => {
  const users = db.select('users', {});
  res.json({ users: users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role })) });
});

// 서버 시작
async function main() {
  await server.start();
  console.log('✅ Auth Server running on http://localhost:3000');
  console.log('');
  console.log('📝 Test endpoints:');
  console.log('  POST   /api/auth/register  - 회원가입');
  console.log('  POST   /api/auth/login     - 로그인');
  console.log('  GET    /api/auth/me        - 현재 사용자 (인증 필수)');
  console.log('  POST   /api/auth/verify    - 토큰 검증');
  console.log('  GET    /api/admin/users    - 사용자 목록 (관리자만)');
}

main().catch(console.error);

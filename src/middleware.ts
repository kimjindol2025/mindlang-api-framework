/**
 * 미들웨어 파이프라인
 */

import { Request, Response, Middleware } from './types';

export class MiddlewarePipeline {
  private middlewares: Middleware[] = [];

  /**
   * 전역 미들웨어 추가
   */
  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * 미들웨어 파이프라인 실행
   */
  async execute(req: Request, res: Response, routeMiddlewares: Middleware[], finalHandler: () => Promise<void>) {
    let index = 0;

    // 모든 미들웨어를 연결
    const allMiddlewares = [...this.middlewares, ...routeMiddlewares];

    const next = async () => {
      if (index < allMiddlewares.length) {
        const middleware = allMiddlewares[index++];
        await middleware(req, res, next);
      } else {
        await finalHandler();
      }
    };

    await next();
  }
}

/**
 * 기본 미들웨어들
 */
export const CommonMiddlewares = {
  /**
   * CORS 미들웨어
   */
  cors: (): Middleware => {
    return async (req, res, next) => {
      res.headers['Access-Control-Allow-Origin'] = '*';
      res.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
      res.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

      if (req.method === 'OPTIONS') {
        res.send(200, {});
        return;
      }

      await next();
    };
  },

  /**
   * 요청 로깅 미들웨어
   */
  logger: (): Middleware => {
    return async (req, res, next) => {
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

      await next();

      const duration = Date.now() - startTime;
      console.log(`  ↳ ${res.statusCode} (${duration}ms)`);
    };
  },

  /**
   * 에러 핸들링 미들웨어
   */
  errorHandler: (): Middleware => {
    return async (req, res, next) => {
      try {
        await next();
      } catch (error: any) {
        console.error('Error:', error);
        res.error(500, error.message || 'Internal Server Error');
      }
    };
  },

  /**
   * JSON 파싱 미들웨어
   */
  json: (): Middleware => {
    return async (req, res, next) => {
      if (req.headers['content-type']?.includes('application/json') && req.body) {
        try {
          if (typeof req.body === 'string') {
            req.body = JSON.parse(req.body);
          }
        } catch (e) {
          res.error(400, 'Invalid JSON');
          return;
        }
      }
      await next();
    };
  },

  /**
   * 인증 검증 미들웨어 (JWT)
   */
  requireAuth: (authService: any): Middleware => {
    return async (req, res, next) => {
      const token = req.headers['authorization']?.replace('Bearer ', '');

      if (!token) {
        res.error(401, 'Unauthorized');
        return;
      }

      try {
        const payload = await authService.verify(token);
        req.user = payload;
        await next();
      } catch (error: any) {
        res.error(401, 'Invalid token');
      }
    };
  },

  /**
   * 역할 기반 접근 제어
   */
  requireRole: (roles: string[]): Middleware => {
    return async (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        res.error(403, 'Forbidden');
        return;
      }
      await next();
    };
  },

  /**
   * 요청 검증 미들웨어
   */
  validate: (schema: Record<string, any>): Middleware => {
    return async (req, res, next) => {
      const errors: string[] = [];

      for (const [field, type] of Object.entries(schema)) {
        const value = req.body?.[field];

        if (!value && type.required) {
          errors.push(`${field} is required`);
        } else if (value && typeof value !== type.type) {
          errors.push(`${field} must be ${type.type}`);
        }
      }

      if (errors.length > 0) {
        res.error(400, errors.join(', '));
        return;
      }

      await next();
    };
  },

  /**
   * 속도 제한 미들웨어
   */
  rateLimit: (maxRequests: number, windowMs: number): Middleware => {
    const requests: Record<string, number[]> = {};

    return async (req, res, next) => {
      const ip = req.headers['x-forwarded-for'] || 'unknown';
      const now = Date.now();

      if (!requests[ip]) {
        requests[ip] = [];
      }

      // 시간 윈도우 내의 요청만 유지
      requests[ip] = requests[ip].filter(t => now - t < windowMs);

      if (requests[ip].length >= maxRequests) {
        res.error(429, 'Too Many Requests');
        return;
      }

      requests[ip].push(now);
      await next();
    };
  },
};

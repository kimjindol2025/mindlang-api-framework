/**
 * MindLang API Framework - 메인 서버
 * HTTP 모듈 기반 경량 REST API 서버
 */

import { Router } from './router';
import { MiddlewarePipeline, CommonMiddlewares } from './middleware';
import { Request, Response, ServerConfig, Middleware, RouteHandler, HTTPMethod } from './types';
import { AuthService, UserAuthService } from './auth';

export class MindLangServer {
  private router: Router;
  private pipeline: MiddlewarePipeline;
  private config: ServerConfig;
  private authService?: AuthService;
  private db: any; // Database 인스턴스
  private listening: boolean = false;

  constructor(config: ServerConfig, db?: any) {
    this.config = config;
    this.router = new Router();
    this.pipeline = new MiddlewarePipeline();
    this.db = db;

    // 인증 서비스 초기화
    if (config.auth) {
      this.authService = new AuthService(config.auth);
    }

    // 기본 미들웨어
    this.pipeline.use(CommonMiddlewares.logger());
    this.pipeline.use(CommonMiddlewares.errorHandler());
    this.pipeline.use(CommonMiddlewares.json());

    if (config.cors) {
      this.pipeline.use(CommonMiddlewares.cors());
    }
  }

  /**
   * GET 라우트 등록
   */
  get(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.router.get(path, handler, middlewares);
  }

  /**
   * POST 라우트 등록
   */
  post(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.router.post(path, handler, middlewares);
  }

  /**
   * PUT 라우트 등록
   */
  put(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.router.put(path, handler, middlewares);
  }

  /**
   * DELETE 라우트 등록
   */
  delete(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.router.delete(path, handler, middlewares);
  }

  /**
   * PATCH 라우트 등록
   */
  patch(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.router.patch(path, handler, middlewares);
  }

  /**
   * 전역 미들웨어 추가
   */
  use(middleware: Middleware) {
    this.pipeline.use(middleware);
  }

  /**
   * 인증 미들웨어 적용
   */
  requireAuth(): Middleware {
    if (!this.authService) {
      throw new Error('Auth not configured');
    }
    return CommonMiddlewares.requireAuth(this.authService);
  }

  /**
   * 역할 기반 접근 제어 미들웨어
   */
  requireRole(roles: string[]): Middleware {
    return CommonMiddlewares.requireRole(roles);
  }

  /**
   * 요청 검증 미들웨어
   */
  validate(schema: Record<string, any>): Middleware {
    return CommonMiddlewares.validate(schema);
  }

  /**
   * 속도 제한 미들웨어
   */
  rateLimit(maxRequests: number, windowMs: number): Middleware {
    return CommonMiddlewares.rateLimit(maxRequests, windowMs);
  }

  /**
   * 인증 서비스 반환
   */
  getAuthService(): AuthService | undefined {
    return this.authService;
  }

  /**
   * Database 반환
   */
  getDatabase(): any {
    return this.db;
  }

  /**
   * 서버 시작
   */
  async start(): Promise<void> {
    // HTTP 서버는 실제 HTTP 모듈을 사용하여 구현
    // 이 예제에서는 구조를 보여줍니다
    console.log(`🚀 MindLang API Server starting on port ${this.config.port}...`);
    this.listening = true;

    // 실제 구현에서는:
    // const server = createServer((request) => this.handleRequest(request));
    // server.listen(this.config.port, this.config.hostname);
  }

  /**
   * 요청 처리 (HTTP 모듈이 호출)
   */
  async handleRequest(httpRequest: any): Promise<Response> {
    // 요청 파싱
    const req = this.parseRequest(httpRequest);

    // 응답 객체 생성
    const res = this.createResponse();

    // 라우트 매칭
    const match = this.router.match(req.method, req.path);

    if (!match) {
      res.error(404, `Not Found: ${req.method} ${req.path}`);
      return res;
    }

    const { route, params } = match;
    req.params = params;

    // 미들웨어 파이프라인 실행
    await this.pipeline.execute(req, res, route.middlewares, async () => {
      await route.handler(req, res);
    });

    return res;
  }

  /**
   * HTTP 요청 파싱
   */
  private parseRequest(httpRequest: any): Request {
    // URL 파싱
    const url = new URL(httpRequest.url || '/', `http://${httpRequest.headers.host || 'localhost'}`);

    return {
      method: (httpRequest.method || 'GET') as HTTPMethod,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      params: {},
      headers: httpRequest.headers || {},
      body: httpRequest.body,
      timestamp: Date.now(),
    };
  }

  /**
   * 응답 객체 생성
   */
  private createResponse(): Response {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: null,

      send: function (statusCode: number, data: any) {
        this.statusCode = statusCode;
        this.body = data;
      },

      json: function (data: any, statusCode: number = 200) {
        this.statusCode = statusCode;
        this.headers['Content-Type'] = 'application/json';
        this.body = data;
      },

      error: function (statusCode: number, message: string) {
        this.statusCode = statusCode;
        this.body = { error: message };
      },
    };
  }

  /**
   * 서버 중지
   */
  async stop(): Promise<void> {
    this.listening = false;
    console.log('🛑 Server stopped');
  }

  /**
   * 서버 상태
   */
  isListening(): boolean {
    return this.listening;
  }
}

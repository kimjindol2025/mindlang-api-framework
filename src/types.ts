/**
 * MindLang API Framework - Type Definitions
 * Express 없이 순수 MindLang으로 구현한 REST API 프레임워크
 */

// HTTP 메서드
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

// 요청 객체
export interface Request {
  method: HTTPMethod;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string>;
  body: any;
  user?: any; // JWT 인증 후 사용자 정보
  timestamp: number;
}

// 응답 객체
export interface Response {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  send(statusCode: number, data: any): void;
  json(data: any, statusCode?: number): void;
  error(statusCode: number, message: string): void;
}

// 라우트 핸들러
export type RouteHandler = (req: Request, res: Response) => Promise<void> | void;

// 미들웨어
export type Middleware = (req: Request, res: Response, next: () => Promise<void>) => Promise<void> | void;

// 라우트 정의
export interface Route {
  method: HTTPMethod;
  path: string;
  handler: RouteHandler;
  middlewares: Middleware[];
}

// JWT 토큰 페이로드
export interface JWTPayload {
  userId: string;
  email?: string;
  role?: string;
  iat?: number; // 발급 시간
  exp?: number; // 만료 시간
  [key: string]: any;
}

// 인증 옵션
export interface AuthOptions {
  secret: string;
  expiresIn?: number; // 초 단위
  algorithm?: string;
}

// 서버 설정
export interface ServerConfig {
  port: number;
  hostname?: string;
  auth?: AuthOptions;
  cors?: boolean;
}

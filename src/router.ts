/**
 * 라우터 - 경로 매칭 및 라우팅 로직
 */

import { Route, RouteHandler, HTTPMethod, Middleware, Request, Response } from './types';

export class Router {
  private routes: Route[] = [];

  /**
   * GET 라우트 등록
   */
  get(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.register('GET', path, handler, middlewares);
  }

  /**
   * POST 라우트 등록
   */
  post(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.register('POST', path, handler, middlewares);
  }

  /**
   * PUT 라우트 등록
   */
  put(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.register('PUT', path, handler, middlewares);
  }

  /**
   * DELETE 라우트 등록
   */
  delete(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.register('DELETE', path, handler, middlewares);
  }

  /**
   * PATCH 라우트 등록
   */
  patch(path: string, handler: RouteHandler, middlewares: Middleware[] = []) {
    this.register('PATCH', path, handler, middlewares);
  }

  /**
   * 라우트 등록
   */
  private register(method: HTTPMethod, path: string, handler: RouteHandler, middlewares: Middleware[]) {
    this.routes.push({ method, path, handler, middlewares });
  }

  /**
   * 경로 매칭
   */
  match(method: HTTPMethod, path: string): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const params = this.matchPath(route.path, path);
      if (params !== null) {
        return { route, params };
      }
    }
    return null;
  }

  /**
   * 경로 패턴 매칭 및 파라미터 추출
   * /users/:id/posts/:postId → { id: '123', postId: '456' }
   */
  private matchPath(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(p => p);
    const pathParts = path.split('/').filter(p => p);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const part = patternParts[i];

      if (part.startsWith(':')) {
        // 파라미터: :id
        const paramName = part.slice(1);
        params[paramName] = pathParts[i];
      } else if (part !== pathParts[i]) {
        // 정적 경로 불일치
        return null;
      }
    }

    return params;
  }

  /**
   * 모든 라우트 반환
   */
  getRoutes(): Route[] {
    return this.routes;
  }
}

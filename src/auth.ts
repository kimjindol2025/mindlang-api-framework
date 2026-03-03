/**
 * JWT 인증 서비스
 * Crypto 모듈을 사용한 토큰 생성 및 검증
 */

import { JWTPayload, AuthOptions } from './types';

export class AuthService {
  private secret: string;
  private expiresIn: number; // 초 단위
  private algorithm: string;

  constructor(options: AuthOptions) {
    this.secret = options.secret;
    this.expiresIn = options.expiresIn || 3600; // 기본 1시간
    this.algorithm = options.algorithm || 'HS256';
  }

  /**
   * JWT 토큰 생성
   */
  async sign(payload: JWTPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.expiresIn,
    };

    // Header
    const header = {
      alg: this.algorithm,
      typ: 'JWT',
    };

    // Base64URL 인코딩
    const headerEncoded = this.base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(tokenPayload));

    // 서명
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const signature = await this.createSignature(signatureInput);

    return `${signatureInput}.${signature}`;
  }

  /**
   * JWT 토큰 검증
   */
  async verify(token: string): Promise<JWTPayload> {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerEncoded, payloadEncoded, signatureProvided] = parts;

    // 서명 검증
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const signatureExpected = await this.createSignature(signatureInput);

    if (signatureProvided !== signatureExpected) {
      throw new Error('Invalid signature');
    }

    // Payload 디코딩
    const payloadJson = this.base64UrlDecode(payloadEncoded);
    const payload = JSON.parse(payloadJson);

    // 만료 시간 검증
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    return payload;
  }

  /**
   * 서명 생성 (HMAC-SHA256)
   */
  private async createSignature(message: string): Promise<string> {
    // Node.js crypto 모듈을 사용한 HMAC-SHA256
    // MindLang Crypto 모듈: crypto.hmac(message, secret, 'sha256')
    const signature = this.simpleHmacSha256(message, this.secret);
    return this.base64UrlEncode(signature);
  }

  /**
   * HMAC-SHA256 구현 (간단한 버전)
   * 실제로는 MindLang의 crypto.hmac() 사용
   */
  private simpleHmacSha256(message: string, secret: string): string {
    // 간단한 구현: 실제 환경에서는 완전한 HMAC 구현 필요
    // 여기서는 데모 목적으로 간단한 버전
    const combined = `${secret}${message}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Base64URL 인코딩
   */
  private base64UrlEncode(str: string): string {
    const base64 = Buffer.from(str).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Base64URL 디코딩
   */
  private base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // 패딩 추가
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * 토큰에서 페이로드 추출 (검증 없이)
   * 디버깅용
   */
  decode(token: string): JWTPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const payloadJson = this.base64UrlDecode(parts[1]);
    return JSON.parse(payloadJson);
  }
}

/**
 * 사용자 관리 & 인증 서비스
 */
export class UserAuthService {
  private db: any; // Database 인스턴스
  private authService: AuthService;

  constructor(db: any, authService: AuthService) {
    this.db = db;
    this.authService = authService;
  }

  /**
   * 사용자 가입
   */
  async register(email: string, password: string, name: string): Promise<any> {
    // 중복 확인
    const existing = this.db.select('users', { email });
    if (existing.length > 0) {
      throw new Error('Email already exists');
    }

    // 비밀번호 해싱 (간단한 버전, 실제로는 bcrypt 사용)
    const hashedPassword = this.hashPassword(password);

    // 사용자 생성
    const user = {
      id: this.generateId(),
      email,
      password: hashedPassword,
      name,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    this.db.insert('users', user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  /**
   * 로그인
   */
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const users = this.db.select('users', { email });

    if (users.length === 0 || !this.verifyPassword(password, users[0].password)) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];
    const token = await this.authService.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * 비밀번호 해싱 (간단한 버전)
   */
  private hashPassword(password: string): string {
    // 실제 환경: bcrypt 또는 crypto.hash() 사용
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 비밀번호 검증
   */
  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  /**
   * ID 생성
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

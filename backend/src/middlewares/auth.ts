import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { fail } from '../utils/apiResponse.js';

/** Thong tin nguoi dung lay tu access token (thay cho User.Claims ben .NET). */
export interface AuthUser {
  userId: string;
  email: string;
  role: string; // Admin | Giao_Vien | Hoc_Sinh | Phu_Huynh ...
  fullName: string;
  profileId: string | null; // MaHocSinh / MaGiangVien / MaPhuHuynh tuy vai tro
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  fullName: string;
  profileId?: string;
}

export function signAccessToken(user: AuthUser): string {
  const payload: TokenPayload = {
    sub: user.userId,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    ...(user.profileId ? { profileId: user.profileId } : {}),
  };
  return jwt.sign(payload, config.jwt.secret, {
    algorithm: 'HS256',
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: config.jwt.accessTokenMinutes * 60,
  });
}

export function verifyAccessToken(token: string): AuthUser {
  const p = jwt.verify(token, config.jwt.secret, {
    algorithms: ['HS256'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    clockTolerance: 30,
  }) as TokenPayload;
  return { userId: p.sub, email: p.email, role: p.role, fullName: p.fullName, profileId: p.profileId ?? null };
}

/** Bat buoc dang nhap ([Authorize] ben .NET). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json(fail('Chưa đăng nhập.', 'AUTH_REQUIRED'));
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json(fail('Token không hợp lệ hoặc đã hết hạn.', 'AUTH_TOKEN_INVALID'));
  }
}

/** Chi cho phep mot so vai tro ([Authorize(Roles = "...")] ben .NET). Dung SAU requireAuth. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json(fail('Chưa đăng nhập.', 'AUTH_REQUIRED'));
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(fail('Bạn không có quyền truy cập tài nguyên này.', 'AUTH_FORBIDDEN'));
    }
    return next();
  };
}

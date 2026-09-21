import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

type TokenPayload = {
  sub: string;
  email: string;
  displayName: string;
  role: string;
  zonaAsignada?: string;
  mustChangePassword: boolean;
};

export const requireAuth: RequestHandler = (request, _response, next) => {
  const token =
    request.headers.authorization?.replace(/^Bearer\s+/i, '') ||
    (typeof request.query.token === 'string' ? request.query.token : undefined);

  if (!token) return next(new AppError('Sesión requerida', 401, 'UNAUTHORIZED'));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    request.user = {
      id: Number(payload.sub),
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
      zonaAsignada: payload.zonaAsignada,
      mustChangePassword: payload.mustChangePassword,
    };

    // If password change is required, only allow routes changing password, checking me, or viewing documents
    if (
      payload.mustChangePassword &&
      !request.originalUrl.includes('/change-password') &&
      !request.originalUrl.includes('/me') &&
      !request.originalUrl.includes('/document')
    ) {
      return next(new AppError('Cambio de contraseña obligatorio', 403, 'PASSWORD_CHANGE_REQUIRED'));
    }

    next();
  } catch {
    next(new AppError('La sesión expiró o no es válida', 401, 'INVALID_TOKEN'));
  }
};

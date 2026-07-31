import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

type TokenPayload = {
  sub: string;
  email: string;
  displayName: string;
  role: string;
};

export const requireAuth: RequestHandler = (request, _response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError('Sesión requerida', 401, 'UNAUTHORIZED'));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    request.user = {
      id: Number(payload.sub),
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError('La sesión expiró o no es válida', 401, 'INVALID_TOKEN'));
  }
};

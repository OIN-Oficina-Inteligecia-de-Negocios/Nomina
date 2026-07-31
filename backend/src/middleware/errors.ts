import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'BAD_REQUEST',
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response.status(422).json({
      error: 'Los datos enviados no son válidos',
      code: 'VALIDATION_ERROR',
      details: error.flatten().fieldErrors,
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: 'Ocurrió un error interno',
    code: 'INTERNAL_ERROR',
  });
};

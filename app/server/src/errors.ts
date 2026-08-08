import type { Response } from 'express';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_ERROR';

export type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
  };
};

export function errorBody(code: ErrorCode, message: string, field?: string): ErrorBody {
  return { error: field === undefined ? { code, message } : { code, message, field } };
}

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  field?: string,
): void {
  res.status(status).json(errorBody(code, message, field));
}

export function sendNotFound(res: Response, message = 'todo not found'): void {
  sendError(res, 404, 'NOT_FOUND', message);
}

// Zod reports every issue; the API surfaces only the first so the error body
// stays a single stable shape that one schema can validate.
export function sendZodError(res: Response, error: ZodError): void {
  const issue = error.issues[0];
  const field =
    issue.code === 'unrecognized_keys'
      ? issue.keys[0]
      : typeof issue.path[0] === 'string'
        ? issue.path[0]
        : undefined;

  sendError(res, 400, 'VALIDATION_ERROR', issue.message, field);
}

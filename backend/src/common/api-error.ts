import { HttpException, HttpStatus } from '@nestjs/common';


export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'MOVIE_NOT_FOUND'
  | 'CINEMA_NOT_FOUND'
  | 'UNKNOWN_PREREQUISITE'
  | 'DUPLICATE_TITLE'
  | 'DUPLICATE_NAME'
  | 'CIRCULAR_DEPENDENCY';

export class ApiError extends HttpException {
  constructor(status: HttpStatus, error: ErrorCode, message: string | string[]) {
    super({ statusCode: status, error, message }, status);
  }
}


export const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  (err as { driverError?: { code?: string } }).driverError?.code === '23505';

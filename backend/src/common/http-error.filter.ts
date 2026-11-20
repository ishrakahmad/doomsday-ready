import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Normalises every HTTP error to `{ statusCode, error, message }`, where
 * `error` is always an UPPER_SNAKE_CASE code (e.g. CIRCULAR_DEPENDENCY,
 * NOT_FOUND), so clients can switch on it.
 */
@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    let error = HttpStatus[status] ?? 'ERROR';
    let message: unknown = exception.message;

    if (typeof body === 'object' && body !== null) {
      const b = body as { error?: unknown; message?: unknown };
      if (typeof b.error === 'string' && /^[A-Z_]+$/.test(b.error)) error = b.error;
      if (b.message !== undefined) message = b.message;
    }

    response.status(status).json({ statusCode: status, error, message });
  }
}

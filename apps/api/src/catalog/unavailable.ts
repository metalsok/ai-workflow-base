import {
  Catch,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';
import type { Response } from 'express';

export class CatalogUnavailable extends Error {
  constructor(readonly retryAfter = 2) {
    super('Game catalog is temporarily unavailable. Please try again.');
  }
}

@Catch(CatalogUnavailable)
export class CatalogFailureFilter implements ExceptionFilter {
  catch(error: CatalogUnavailable, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Retry-After', error.retryAfter);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(503)
      .json({ message: error.message, statusCode: 503 });
  }
}

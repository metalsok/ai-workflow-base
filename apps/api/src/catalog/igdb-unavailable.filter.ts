import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { IgdbUnavailableError } from './igdb/igdb.client.js';

/**
 * Turns IgdbUnavailableError into `503` with a Retry-After header, so the
 * frontend can show "try again". Add with `@UseFilters(IgdbUnavailableFilter)`.
 */
@Catch(IgdbUnavailableError)
export class IgdbUnavailableFilter implements ExceptionFilter {
  catch(error: IgdbUnavailableError, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(503)
      .setHeader('Retry-After', String(error.retryAfterSeconds))
      .json({ message: error.message, statusCode: 503 });
  }
}

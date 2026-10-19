import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppliedMigration } from './database/history.entity.js';

@Controller('api/health')
export class HealthController {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}
  @Get() async ready() {
    try {
      await this.database.getRepository(AppliedMigration).count();
    } catch {
      throw new ServiceUnavailableException('Database unavailable.');
    }
    return { status: 'ok' };
  }
}

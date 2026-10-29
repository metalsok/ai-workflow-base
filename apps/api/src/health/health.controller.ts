import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Account } from '../accounts/account.entity.js';

@Controller('api/health')
export class HealthController {
  constructor(
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
  ) {}

  /** Used by Docker to know the API can reach PostgreSQL. No sign-in needed. */
  @Get()
  async check() {
    try {
      await this.accounts.exists();
    } catch {
      throw new ServiceUnavailableException('Database unavailable.');
    }
    return { status: 'ok' };
  }
}

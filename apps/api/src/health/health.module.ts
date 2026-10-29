import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../accounts/account.entity.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  controllers: [HealthController],
})
export class HealthModule {}

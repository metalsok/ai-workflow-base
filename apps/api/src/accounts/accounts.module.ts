import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './account.entity.js';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';
import { StoredSession } from './session.entity.js';
import { SignedInGuard } from './signed-in.guard.js';

@Module({
  imports: [TypeOrmModule.forFeature([Account, StoredSession])],
  controllers: [AccountsController],
  providers: [AccountsService, SignedInGuard],
  // Other features use the guard to require a signed-in user.
  exports: [AccountsService, SignedInGuard],
})
export class AccountsModule {}

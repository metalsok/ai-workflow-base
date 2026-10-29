import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { LibraryEntry } from './library-entry.entity.js';
import { LibraryController } from './library.controller.js';
import { LibraryService } from './library.service.js';

@Module({
  imports: [
    AccountsModule,
    CatalogModule,
    TypeOrmModule.forFeature([LibraryEntry]),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}

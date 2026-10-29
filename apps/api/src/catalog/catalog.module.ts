import { IgdbAdapter } from './igdb/igdb.adapter.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module.js';
import { APP_OPTIONS, type AppOptions } from '../app-options.js';
import { CachedFeed } from './cached-feed.entity.js';
import { CachedGame } from './cached-game.entity.js';
import { DiscoveryService } from './discovery.service.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { CLOCK } from './clock.js';
import { IgdbClient } from './igdb/igdb.client.js';

@Module({
  imports: [AccountsModule, TypeOrmModule.forFeature([CachedGame, CachedFeed])],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    DiscoveryService,
    IgdbClient,
    IgdbAdapter,
    {
      provide: CLOCK,
      useFactory: (options: AppOptions) => options.igdb?.clock ?? Date.now,
      inject: [APP_OPTIONS],
    },
  ],
  // The library uses CatalogService to look up and save a game's metadata.
  exports: [CatalogService],
})
export class CatalogModule {}

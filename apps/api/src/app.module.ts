import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_OPTIONS, type AppOptions } from './app-options.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { HealthModule } from './health/health.module.js';
import { LibraryModule } from './library/library.module.js';

/**
 * The root module: connects to PostgreSQL and lists every feature module.
 * Each feature module registers its own tables with TypeOrmModule.forFeature.
 */
@Module({})
export class AppModule {
  static register(options: AppOptions): DynamicModule {
    return {
      module: AppModule,
      // Global, so every feature module can inject APP_OPTIONS.
      global: true,
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: options.databaseUrl,
          // Use the entities that feature modules register.
          autoLoadEntities: true,
          // The tables already exist and are changed only by migrations.
          synchronize: false,
          // Fail at once instead of retrying silently for 30 seconds.
          retryAttempts: 0,
          logging: false,
        }),
        HealthModule,
        AccountsModule,
        CatalogModule,
        LibraryModule,
      ],
      providers: [{ provide: APP_OPTIONS, useValue: options }],
      exports: [APP_OPTIONS],
    };
  }
}

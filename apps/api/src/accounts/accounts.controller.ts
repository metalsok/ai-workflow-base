import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_OPTIONS, type AppOptions } from '../app-options.js';
import { AccountsService, type SignedInAccount } from './accounts.service.js';
import { parseCredentials } from './credentials.js';
import { CurrentAccount, SignedInGuard } from './signed-in.guard.js';
import type { Account } from './account.entity.js';

export const SESSION_COOKIE = 'game_tracker.sid';
export const DEFAULT_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('api/accounts')
export class AccountsController {
  constructor(
    @Inject(AccountsService) private readonly accounts: AccountsService,
    @Inject(APP_OPTIONS) private readonly options: AppOptions,
  ) {}

  @Post('register')
  async register(@Body() body: unknown, @Req() request: Request) {
    const account = await this.accounts.register(parseCredentials(body));
    return this.signIn(request, account);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() request: Request) {
    const account = await this.accounts.checkPassword(parseCredentials(body));
    return this.signIn(request, account);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await new Promise<void>((resolve, reject) =>
      request.session.destroy((error) => (error ? reject(error) : resolve())),
    );
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.secure,
      path: '/',
    });
  }

  @Get('me')
  @UseGuards(SignedInGuard)
  me(@CurrentAccount() account: SignedInAccount): SignedInAccount {
    return account;
  }

  /** Starts a fresh session (new id, new cookie) for this account. */
  private async signIn(
    request: Request,
    account: Account,
  ): Promise<SignedInAccount> {
    // A new session id on every sign-in, so an old cookie cannot be reused.
    await new Promise<void>((resolve, reject) =>
      request.session.regenerate((error) =>
        error ? reject(error) : resolve(),
      ),
    );
    request.session.accountId = account.id;
    request.session.accountVersion = account.sessionVersion;
    request.session.expiresAt =
      Date.now() + (this.options.sessionMaxAgeMs ?? DEFAULT_SESSION_MAX_AGE_MS);
    await new Promise<void>((resolve, reject) =>
      request.session.save((error) => (error ? reject(error) : resolve())),
    );
    return { id: account.id, email: account.email };
  }
}

import {
  Controller,
  type CanActivate,
  type ExecutionContext,
  type DynamicModule,
  Get,
  Inject,
  Module,
  Post,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  HttpCode,
  Res,
  HttpException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { hash, verify } from 'argon2';
import { randomBytes, createHash } from 'node:crypto';
import { Passport } from 'passport';
import { Strategy } from 'passport-local';
import type { Request, Response } from 'express';

declare module 'express-session' {
  interface SessionData {
    accountId: string;
    expiresAt: number;
  }
}

class AccountsService {
  private readonly passport = new Passport();
  private readonly dummyHash = hash(randomBytes(32).toString('hex'));

  constructor(@Inject(Pool) private readonly pool: Pool) {
    this.passport.use(
      new Strategy({ usernameField: 'email' }, (email, password, done) => {
        this.checkPassword(email, password).then(
          (account) => done(null, account ?? false),
          done,
        );
      }),
    );
  }

  private async checkPassword(email: string, password: string) {
    const result = await this.pool.query(
      'SELECT id, email, password_hash FROM accounts WHERE email = $1',
      [email.trim().toLowerCase()],
    );
    const account = result.rows[0] as
      { id: string; email: string; password_hash: string } | undefined;
    const valid = await verify(
      account?.password_hash ?? (await this.dummyHash),
      password,
    );
    return valid && account
      ? { id: account.id, email: account.email }
      : undefined;
  }

  signIn(request: Request) {
    return new Promise<{ id: string; email: string }>((resolve, reject) => {
      this.passport.authenticate(
        'local',
        { session: false },
        (error: unknown, account: { id: string; email: string } | false) => {
          if (error) return reject(error);
          if (!account)
            return reject(
              new UnauthorizedException('Email or password is incorrect.'),
            );
          resolve(account);
        },
      )(request, request.res!, reject);
    });
  }
  async limitAttempts(request: Request, input: unknown) {
    const limits: [string, number][] = [[`ip:${request.ip}`, 60]];
    if (
      request.path.endsWith('/login') &&
      input &&
      typeof input === 'object' &&
      'email' in input &&
      typeof input.email === 'string'
    ) {
      limits.push([
        `email:${input.email.trim().toLowerCase().slice(0, 254)}`,
        10,
      ]);
    }
    await this.pool.query(
      'DELETE FROM authentication_attempts WHERE expires_at <= now()',
    );
    for (const [identity, maximum] of limits) {
      const key = createHash('sha256').update(identity).digest('hex');
      const result = await this.pool.query(
        `
        INSERT INTO authentication_attempts (key, attempts, expires_at)
        VALUES ($1, 1, now() + interval '15 minutes')
        ON CONFLICT (key) DO UPDATE SET attempts = authentication_attempts.attempts + 1
        RETURNING attempts, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (expires_at - now())))) AS retry_after
      `,
        [key],
      );
      if (result.rows[0].attempts > maximum) {
        request.res!.setHeader(
          'Retry-After',
          String(result.rows[0].retry_after),
        );
        throw new HttpException('Too many attempts. Try again later.', 429);
      }
    }
  }

  async register(email: string, password: string) {
    const result = await this.pool.query(
      'INSERT INTO accounts (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id, email',
      [email.trim().toLowerCase(), await hash(password)],
    );
    if (!result.rowCount)
      throw new ConflictException('An account with this email already exists.');
    return result.rows[0] as { id: string; email: string };
  }
  async identity(id: string | undefined) {
    if (!id) throw new UnauthorizedException();
    const result = await this.pool.query(
      'SELECT id, email FROM accounts WHERE id = $1',
      [id],
    );
    if (!result.rowCount) throw new UnauthorizedException();
    return result.rows[0] as { id: string; email: string };
  }
}

export class AccountsGuard implements CanActivate {
  constructor(
    @Inject(AccountsService) private readonly accounts: AccountsService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    await this.accounts.identity(request.session?.accountId);
    return true;
  }
}

@Controller('api/accounts')
class AccountsController {
  constructor(
    @Inject(AccountsService) private readonly accounts: AccountsService,
  ) {}
  @Post('register')
  async register(@Body() input: unknown, @Req() request: Request) {
    await this.accounts.limitAttempts(request, input);
    validateCredentials(input);
    const account = await this.accounts.register(input.email, input.password);
    await this.establishSession(request, account.id);
    return account;
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() input: unknown, @Req() request: Request) {
    await this.accounts.limitAttempts(request, input);
    validateCredentials(input);
    const account = await this.accounts.signIn(request);
    await this.establishSession(request, account.id);
    return account;
  }

  private async establishSession(request: Request, accountId: string) {
    await new Promise<void>((resolve, reject) =>
      request.session.regenerate((error) =>
        error ? reject(error) : resolve(),
      ),
    );
    request.session.accountId = accountId;
    request.session.expiresAt = Date.now() + request.app.locals.sessionMaxAgeMs;
    await new Promise<void>((resolve, reject) =>
      request.session.save((error) => (error ? reject(error) : resolve())),
    );
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
    response.clearCookie('game_tracker.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.secure,
      path: '/',
    });
  }

  @Get('me')
  me(@Req() request: Request) {
    return this.accounts.identity(request.session?.accountId);
  }
}

@Module({})
export class AccountsModule {
  static forPool(pool: Pool): DynamicModule {
    return {
      module: AccountsModule,
      controllers: [AccountsController],
      providers: [
        { provide: Pool, useValue: pool },
        AccountsService,
        AccountsGuard,
      ],
      exports: [AccountsGuard, AccountsService],
    };
  }
}

function validateCredentials(
  input: unknown,
): asserts input is { email: string; password: string } {
  if (
    !input ||
    typeof input !== 'object' ||
    !('email' in input) ||
    !('password' in input) ||
    typeof input.email !== 'string' ||
    typeof input.password !== 'string' ||
    input.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ||
    input.password.length < 12 ||
    input.password.length > 128
  ) {
    throw new BadRequestException(
      'Use a valid email and a password of 12–128 characters.',
    );
  }
}

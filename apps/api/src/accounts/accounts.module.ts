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
import { DataSource, LessThanOrEqual, type Repository } from 'typeorm';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './account.entity.js';
import { AuthenticationAttempt } from './authentication-attempt.entity.js';
import { postgresError, retryTransaction } from '../database/retry.js';
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

  constructor(
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
    @Inject(DataSource) private readonly database: DataSource,
    @Inject('authentication-clock') private readonly now: () => number,
  ) {
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
    const account = await this.accounts.findOneBy({
      email: email.trim().toLowerCase(),
    });
    const valid = await verify(
      account?.passwordHash ?? (await this.dummyHash),
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
    const now = this.now();
    await this.database
      .getRepository(AuthenticationAttempt)
      .delete({ expiresAt: LessThanOrEqual(new Date(now)) });
    for (const [identity, maximum] of limits) {
      const key = createHash('sha256').update(identity).digest('hex');
      const counter = await retryTransaction(
        () =>
          this.database.transaction('SERIALIZABLE', async (manager) => {
            const attempts = manager.getRepository(AuthenticationAttempt);
            let counter = await attempts.findOneBy({ key });
            if (!counter || counter.expiresAt.valueOf() <= now) {
              counter = attempts.create({
                key,
                attempts: 0,
                expiresAt: new Date(now + 15 * 60 * 1000),
              });
            }
            counter.attempts++;
            return attempts.save(counter);
          }),
        'authentication_attempts_pkey',
      );
      // Throw only after commit. IP accounting is committed before email accounting.
      if (counter.attempts > maximum) {
        request.res!.setHeader(
          'Retry-After',
          String(
            Math.max(1, Math.ceil((counter.expiresAt.valueOf() - now) / 1000)),
          ),
        );
        throw new HttpException('Too many attempts. Try again later.', 429);
      }
    }
  }

  async register(email: string, password: string) {
    try {
      const account = await this.accounts.save(
        this.accounts.create({
          email: email.trim().toLowerCase(),
          passwordHash: await hash(password),
        }),
      );
      return { id: account.id, email: account.email };
    } catch (error) {
      const { code, constraint } = postgresError(error);
      if (code === '23505' && constraint === 'accounts_email_key')
        throw new ConflictException(
          'An account with this email already exists.',
        );
      throw error;
    }
  }
  async identity(id: string | undefined) {
    if (!id) throw new UnauthorizedException();
    const account = await this.accounts.findOne({
      where: { id },
      select: { id: true, email: true },
    });
    if (!account) throw new UnauthorizedException();
    return { id: account.id, email: account.email };
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
  static forClock(now: () => number): DynamicModule {
    return {
      module: AccountsModule,
      imports: [TypeOrmModule.forFeature([Account, AuthenticationAttempt])],
      controllers: [AccountsController],
      providers: [
        { provide: 'authentication-clock', useValue: now },
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

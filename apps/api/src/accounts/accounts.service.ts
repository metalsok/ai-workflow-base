import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import { QueryFailedError, type Repository } from 'typeorm';
import { Account } from './account.entity.js';
import type { Credentials } from './credentials.js';

/** What the browser is allowed to see about an account. */
export interface SignedInAccount {
  id: string;
  email: string;
}

@Injectable()
export class AccountsService {
  // Used when the email is unknown, so a wrong email takes as long as a
  // wrong password and nobody can probe which emails have accounts.
  private readonly unknownAccountHash = hash(randomBytes(32).toString('hex'));

  constructor(
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
  ) {}

  async register({ email, password }: Credentials): Promise<Account> {
    try {
      return await this.accounts.save(
        this.accounts.create({ email, passwordHash: await hash(password) }),
      );
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException(
          'An account with this email already exists.',
        );
      throw error;
    }
  }

  async checkPassword({ email, password }: Credentials): Promise<Account> {
    const account = await this.accounts.findOneBy({ email });
    const hashToCheck =
      account?.passwordHash ?? (await this.unknownAccountHash);
    if (!(await verify(hashToCheck, password)) || !account)
      throw new UnauthorizedException('Email or password is incorrect.');
    return account;
  }

  /** The account a session belongs to, or null if it no longer may use it. */
  async  findSignedIn(
    accountId: string | undefined,
    accountVersion: number | undefined,
  ): Promise<SignedInAccount | null> {
    if (!accountId) return null;
    return this.accounts.findOne({
      where: { id: accountId, sessionVersion: accountVersion ?? 0 },
      select: { id: true, email: true },
    });
  }
}

/** PostgreSQL error 23505: a UNIQUE constraint (here: the email) was violated. */
function isUniqueViolation(error: unknown) {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}

import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { AccountsService, type SignedInAccount } from './accounts.service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by SignedInGuard. */
      account?: SignedInAccount;
    }
  }
}

/**
 * Put `@UseGuards(SignedInGuard)` on a controller or route to require a
 * signed-in user (401 otherwise). Read the user with `@CurrentAccount()`.
 */
@Injectable()
export class SignedInGuard implements CanActivate {
  constructor(
    @Inject(AccountsService) private readonly accounts: AccountsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const account = await this.accounts.findSignedIn(
      request.session.accountId,
      request.session.accountVersion,
    );
    if (!account) throw new UnauthorizedException();
    request.account = account;
    return true;
  }
}

/** The signed-in account. Only use on routes protected by SignedInGuard. */
export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SignedInAccount =>
    context.switchToHttp().getRequest<Request>().account!,
);

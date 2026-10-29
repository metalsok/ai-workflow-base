package dev.gametracker.api.accounts;

import java.util.UUID;

/** What the browser may see about an account: {@code {id, email}}. */
record AccountResponse(UUID id, String email) {

    static AccountResponse from(SignedInAccount account) {
        return new AccountResponse(account.id(), account.email());
    }
}

package dev.gametracker.api.accounts;

/** Answered with 409 by ApiExceptionHandler. */
public class EmailAlreadyRegisteredException extends RuntimeException {

    EmailAlreadyRegisteredException() {
        super("An account with this email already exists.");
    }
}

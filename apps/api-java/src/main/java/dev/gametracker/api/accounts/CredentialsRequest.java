package dev.gametracker.api.accounts;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The JSON body of register and login. Bean Validation checks it before the controller runs;
 * a failure becomes a 400 with {@link #INVALID} as the message.
 */
record CredentialsRequest(
        @NotNull(message = INVALID)
                @Size(max = 254, message = INVALID)
                // Surrounding spaces are allowed: AccountService.normalizeEmail trims them.
                @Pattern(regexp = "\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\s*", message = INVALID)
                String email,
        @NotNull(message = INVALID) @Size(min = 12, max = 128, message = INVALID) String password) {

    static final String INVALID = "Use a valid email and a password of 12–128 characters.";

    /** Keeps the password out of logs and error messages. */
    @Override
    public String toString() {
        return "CredentialsRequest[email=" + email + "]";
    }
}

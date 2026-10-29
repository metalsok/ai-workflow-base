package dev.gametracker.api.accounts;

import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/** The rules for accounts. Signing in is Spring Security's job (see AccountUserDetailsService). */
@Service
class AccountService {

    private final AccountRepository accounts;
    private final PasswordEncoder passwordEncoder;

    AccountService(AccountRepository accounts, PasswordEncoder passwordEncoder) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Creates an account. No {@code @Transactional}: hashing is deliberately slow, and a single
     * insert needs no transaction of its own, so no database connection is held while hashing.
     *
     * @throws EmailAlreadyRegisteredException if the email is taken
     */
    Account register(String email, String password) {
        var account = new Account(normalizeEmail(email), passwordEncoder.encode(password));
        try {
            // Flush now, so a duplicate email fails here and not at some later commit.
            return accounts.saveAndFlush(account);
        } catch (DataIntegrityViolationException duplicate) {
            // The unique constraint is the source of truth: checking first and inserting
            // afterwards would let two simultaneous registrations both pass the check.
            throw new EmailAlreadyRegisteredException();
        }
    }

    Optional<Account> findByEmail(String email) {
        return accounts.findByEmail(normalizeEmail(email));
    }

    /** " Alice@Example.com " and "alice@example.com" are the same account. */
    static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }
}

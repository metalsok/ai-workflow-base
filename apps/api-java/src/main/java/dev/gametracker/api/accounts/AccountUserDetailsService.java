package dev.gametracker.api.accounts;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

/**
 * Lets Spring Security's {@code DaoAuthenticationProvider} find the account behind an email.
 * The provider then checks the password itself. It also spends the same time hashing when the
 * email is unknown, so response times do not reveal which emails have accounts.
 */
@Component
class AccountUserDetailsService implements UserDetailsService {

    private final AccountService accountService;

    AccountUserDetailsService(AccountService accountService) {
        this.accountService = accountService;
    }

    @Override
    public UserDetails loadUserByUsername(String email) {
        return accountService
                .findByEmail(email)
                .map(SignedInAccount::withPasswordHash)
                .orElseThrow(() -> new UsernameNotFoundException("No account for this email."));
    }
}

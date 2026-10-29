package dev.gametracker.api.accounts;

import java.io.Serial;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * The signed-in user as Spring Security sees it. After sign-in it is stored in the session
 * (serialized into PostgreSQL by Spring Session), so it must stay small and serializable.
 *
 * <p>{@link #getUsername()} is the account id rather than the email: Spring Session indexes
 * sessions by this name, and an id never changes.
 */
public final class SignedInAccount implements UserDetails, CredentialsContainer {

    @Serial
    private static final long serialVersionUID = 1L;

    private final UUID id;
    private final String email;
    /** Only present while the password is being checked; erased before the session stores us. */
    private String passwordHash;

    private SignedInAccount(UUID id, String email, String passwordHash) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    /** For checking a password at sign-in. */
    static SignedInAccount withPasswordHash(Account account) {
        return new SignedInAccount(account.getId(), account.getEmail(), account.getPasswordHash());
    }

    /** For an account that has just proven who it is, e.g. right after registering. */
    static SignedInAccount of(Account account) {
        return new SignedInAccount(account.getId(), account.getEmail(), null);
    }

    public UUID id() {
        return id;
    }

    public String email() {
        return email;
    }

    @Override
    public String getUsername() {
        return id.toString();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    /** Called by Spring Security once the password has been checked. */
    @Override
    public void eraseCredentials() {
        passwordHash = null;
    }
}

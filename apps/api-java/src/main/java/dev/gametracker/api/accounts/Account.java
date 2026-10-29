package dev.gametracker.api.accounts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One row of the {@code accounts} table. */
@Entity
@Table(name = "accounts")
public class Account {

    /** Hibernate generates a random UUID when the account is first saved. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Always stored trimmed and lower-case (see AccountService.normalizeEmail). Unique. */
    @Column(nullable = false, columnDefinition = "text")
    private String email;

    /** Argon2 hash. Never sent to the browser. */
    @Column(name = "password_hash", nullable = false, columnDefinition = "text")
    private String passwordHash;

    /** Filled in by the database default. */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    /** For JPA, which creates entities by reflection. */
    protected Account() {}

    public Account(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }
}

package dev.gametracker.api.accounts;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Database access for accounts. Spring Data writes the implementation: save, findById, ...
 * come from JpaRepository, and {@code findByEmail} is turned into a query from its name.
 */
interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByEmail(String email);
}

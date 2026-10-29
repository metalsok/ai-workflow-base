package dev.gametracker.api.health;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Used by Docker to know the API can reach PostgreSQL. No sign-in needed. */
@RestController
class HealthController {

    private final JdbcClient jdbc;

    HealthController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/api/health")
    HealthResponse health() {
        try {
            jdbc.sql("SELECT 1").query(Integer.class).single();
        } catch (DataAccessException unreachable) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Database unavailable.");
        }
        return new HealthResponse("ok");
    }

    record HealthResponse(String status) {}
}

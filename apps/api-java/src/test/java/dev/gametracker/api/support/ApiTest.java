package dev.gametracker.api.support;

import dev.gametracker.api.TestcontainersConfiguration;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

/**
 * Base class for HTTP tests: the whole application on a random port, with a disposable
 * PostgreSQL. Spring reuses one application (and one database) for all test classes with the
 * same setup, so tests create their own accounts instead of assuming an empty database.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
public abstract class ApiTest {

    protected static final String PASSWORD = "long-enough-passphrase";

    @LocalServerPort
    private int port;

    protected String baseUrl() {
        return "http://127.0.0.1:" + port;
    }

    /** A new browser: no cookies yet. Loads the app like Angular does, which issues the CSRF cookie. */
    protected ApiClient browser() {
        var client = new ApiClient(baseUrl());
        client.get("/api/accounts/me");
        return client;
    }

    protected static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    protected static Map<String, String> credentials(String email, String password) {
        return Map.of("email", email, "password", password);
    }

    /** A browser that has just registered (and so is signed in) with a fresh account. */
    protected ApiClient registeredBrowser(String email) {
        var client = browser();
        var response = client.post("/api/accounts/register", credentials(email, PASSWORD));
        if (response.status() != 201) {
            throw new IllegalStateException("Registration failed: " + response.raw().body());
        }
        return client;
    }
}

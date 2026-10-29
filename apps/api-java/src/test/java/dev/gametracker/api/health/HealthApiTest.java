package dev.gametracker.api.health;

import static dev.gametracker.api.support.ApiClient.SESSION_COOKIE;
import static org.assertj.core.api.Assertions.assertThat;

import dev.gametracker.api.support.ApiClient;
import dev.gametracker.api.support.ApiTest;
import org.junit.jupiter.api.Test;

/** Ported from tests/api2/health.http.test.ts. */
class HealthApiTest extends ApiTest {

    @Test
    void checksPostgresWithoutASession() {
        var response = new ApiClient(baseUrl()).get("/api/health");

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.json().get("status").asString()).isEqualTo("ok");
        assertThat(response.setCookie(SESSION_COOKIE)).isNull();
    }
}

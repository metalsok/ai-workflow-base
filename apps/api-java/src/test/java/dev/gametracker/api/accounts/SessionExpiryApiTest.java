package dev.gametracker.api.accounts;

import static dev.gametracker.api.support.ApiClient.SESSION_COOKIE;
import static org.assertj.core.api.Assertions.assertThat;

import dev.gametracker.api.support.ApiClient;
import dev.gametracker.api.support.ApiTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

/** Its own application (and database), because the session timeout is different. */
@TestPropertySource(properties = "server.servlet.session.timeout=1s")
class SessionExpiryApiTest extends ApiTest {

    @Test
    void expiredSessionsCannotAuthenticateEvenWhenTheirCookieIsReplayed() throws InterruptedException {
        var cookie = registeredBrowser(uniqueEmail()).cookie(SESSION_COOKIE);
        var replay = new ApiClient(baseUrl());
        replay.setCookie(SESSION_COOKIE, cookie);

        Thread.sleep(2_500);

        assertThat(replay.get("/api/accounts/me").status()).isEqualTo(401);
    }
}

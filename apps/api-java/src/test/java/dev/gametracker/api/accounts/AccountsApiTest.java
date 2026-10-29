package dev.gametracker.api.accounts;

import static dev.gametracker.api.support.ApiClient.SESSION_COOKIE;
import static org.assertj.core.api.Assertions.assertThat;

import dev.gametracker.api.ApiJavaApplication;
import dev.gametracker.api.support.ApiClient;
import dev.gametracker.api.support.ApiTest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Ported from tests/api2/accounts.http.test.ts; CSRF tokens replace the Origin check. */
class AccountsApiTest extends ApiTest {

    @Autowired
    private PostgreSQLContainer postgres;

    @Test
    void registeringCreatesAnAccountAndASignedInCookieSession() {
        var email = uniqueEmail();
        var browser = browser();

        var response = browser.post("/api/accounts/register", credentials("  " + email.toUpperCase() + " ", PASSWORD));

        assertThat(response.status()).isEqualTo(201);
        var identity = response.json();
        assertThat(identity.get("email").asString()).isEqualTo(email);
        assertThat(identity.propertyNames()).containsExactlyInAnyOrder("id", "email");
        assertThat(response.setCookie(SESSION_COOKIE)).containsIgnoringCase("HttpOnly").containsIgnoringCase("SameSite=Lax");

        var me = browser.get("/api/accounts/me");
        assertThat(me.status()).isEqualTo(200);
        assertThat(me.json()).isEqualTo(identity);
    }

    @Test
    void invalidRegistrationInputIsRejectedWithoutASession() {
        List<Object> inputs = List.of(
                Map.of(),
                credentials("invalid", PASSWORD),
                credentials("bad@example.com", "short"),
                Map.of("email", 42, "password", List.of()),
                credentials("bad@example.com", "x".repeat(129)));
        var browser = browser();
        for (var input : inputs) {
            var response = browser.post("/api/accounts/register", input);
            assertThat(response.status()).as("input %s", input).isEqualTo(400);
            assertThat(response.json().get("message").asString()).isNotBlank();
            assertThat(response.setCookie(SESSION_COOKIE)).isNull();
        }
        assertThat(browser.post("/api/accounts/register").status()).as("no body").isEqualTo(400);
        assertThat(browser.post("/api/accounts/register", credentials("bad@example.com", "short"))
                        .json().get("message").asString())
                .isEqualTo("Use a valid email and a password of 12–128 characters.");
    }

    @Test
    void duplicateRegistrationIsCaseInsensitiveAndKeepsTheExistingAccountUsable() {
        var email = uniqueEmail();
        registeredBrowser(email);

        var response = browser().post("/api/accounts/register", credentials(email.toUpperCase(), "a-different-password"));

        assertThat(response.status()).isEqualTo(409);
        assertThat(response.json().get("message").asString()).isEqualTo("An account with this email already exists.");
        assertThat(response.setCookie(SESSION_COOKIE)).isNull();
        assertThat(response.raw().body()).doesNotContainIgnoringCase("password_hash").doesNotContainIgnoringCase("argon2");
        assertThat(browser().post("/api/accounts/login", credentials(email, PASSWORD)).status()).isEqualTo(200);
    }

    @Test
    void signInAcceptsTheOriginalPasswordAndRejectsWrongOrUnknownCredentials() {
        var email = uniqueEmail();
        registeredBrowser(email);

        for (var tried : List.of(email, uniqueEmail())) {
            var rejected = browser().post("/api/accounts/login", credentials(tried, "a-different-password"));
            assertThat(rejected.status()).isEqualTo(401);
            assertThat(rejected.setCookie(SESSION_COOKIE)).isNull();
            assertThat(rejected.json().get("message").asString()).isEqualTo("Email or password is incorrect.");
        }

        var browser = browser();
        var response = browser.post("/api/accounts/login", credentials(email.toUpperCase(), PASSWORD));
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.json().get("email").asString()).isEqualTo(email);
        assertThat(response.json().propertyNames()).containsExactlyInAnyOrder("id", "email");
        assertThat(browser.get("/api/accounts/me").json()).isEqualTo(response.json());

        var anonymous = new ApiClient(baseUrl()).get("/api/accounts/me");
        assertThat(anonymous.status()).isEqualTo(401);
        assertThat(anonymous.json().get("message").asString()).isEqualTo("Sign in to continue.");
    }

    @Test
    void signInRotatesTheSessionAndLogoutRevokesIt() {
        var email = uniqueEmail();
        var browser = registeredBrowser(email);
        var original = browser.cookie(SESSION_COOKIE);

        browser.post("/api/accounts/login", credentials(email, PASSWORD));
        var renewed = browser.cookie(SESSION_COOKIE);
        assertThat(renewed).isNotEqualTo(original);
        assertThat(replay(original).status()).isEqualTo(401);

        var logout = browser.post("/api/accounts/logout");
        assertThat(logout.status()).isEqualTo(204);
        assertThat(logout.setCookie(SESSION_COOKIE)).containsIgnoringCase("Max-Age=0");
        assertThat(replay(renewed).status()).isEqualTo(401);
    }

    @Test
    void sessionsSurviveAServerRestart() {
        var cookie = registeredBrowser(uniqueEmail()).cookie(SESSION_COOKIE);

        // A second, separately started server on the same database stands in for a restart:
        // it has nothing in memory, so it can only know the session from PostgreSQL.
        // Command-line arguments, because they win over application.properties.
        try (var restarted = new SpringApplicationBuilder(ApiJavaApplication.class)
                .run(
                        "--server.port=0",
                        "--spring.datasource.url=" + postgres.getJdbcUrl(),
                        "--spring.datasource.username=" + postgres.getUsername(),
                        "--spring.datasource.password=" + postgres.getPassword())) {
            var port = restarted.getEnvironment().getProperty("local.server.port");
            var browser = new ApiClient("http://127.0.0.1:" + port);
            browser.setCookie(SESSION_COOKIE, cookie);
            assertThat(browser.get("/api/accounts/me").status()).isEqualTo(200);
        }
    }

    @Test
    void theFirstRequestIssuesACsrfCookieThatAngularCanRead() {
        var response = new ApiClient(baseUrl()).get("/api/accounts/me");

        assertThat(response.setCookie("XSRF-TOKEN")).isNotNull().doesNotContainIgnoringCase("HttpOnly");
    }

    @Test
    void changesWithoutACsrfTokenAreRejectedEvenWithAValidSession() {
        var email = uniqueEmail();
        var signedIn = registeredBrowser(email);
        var forged = new ApiClient(baseUrl()).withoutCsrfToken();
        forged.setCookie(SESSION_COOKIE, signedIn.cookie(SESSION_COOKIE));

        for (var endpoint : List.of("register", "login", "logout")) {
            var response = forged.post("/api/accounts/" + endpoint, credentials(uniqueEmail(), PASSWORD));
            assertThat(response.status()).as(endpoint).isEqualTo(403);
            assertThat(response.json().get("message").asString()).isEqualTo("This request is missing a valid CSRF token.");
            assertThat(response.setCookie(SESSION_COOKIE)).isNull();
        }

        var me = signedIn.get("/api/accounts/me");
        assertThat(me.status()).isEqualTo(200);
        assertThat(me.header("Cache-Control")).contains("no-store");
    }

    @Test
    void signingInAgainRightAfterLogoutWorks() {
        var email = uniqueEmail();
        var browser = registeredBrowser(email);

        assertThat(browser.post("/api/accounts/logout").status()).isEqualTo(204);

        // Like Angular: the next request is a POST, with whatever CSRF cookie logout left behind.
        assertThat(browser.post("/api/accounts/login", credentials(email, PASSWORD)).status()).isEqualTo(200);
    }

    private ApiClient.Response replay(String sessionCookie) {
        var client = new ApiClient(baseUrl());
        client.setCookie(SESSION_COOKIE, sessionCookie);
        return client.get("/api/accounts/me");
    }
}

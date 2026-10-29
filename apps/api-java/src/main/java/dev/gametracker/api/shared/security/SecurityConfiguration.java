package dev.gametracker.api.shared.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

/**
 * Every security rule of the API, in one place. Read {@link #api} top to bottom: each call
 * switches on or adjusts one Spring Security feature (a filter that every request passes
 * through before it reaches a controller).
 */
@Configuration
class SecurityConfiguration {

    @Bean
    SecurityFilterChain api(HttpSecurity http, SecurityProblemHandler problems) throws Exception {
        // Keeps the CSRF token in a cookie Angular can read (not HttpOnly). Created here,
        // rather than inside spa(), so logout below can hand out a fresh token.
        var csrfTokens = CookieCsrfTokenRepository.withHttpOnlyFalse();
        http
                // 1. Who may call what. Everything not listed needs a signed-in user.
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/accounts/register", "/api/accounts/login")
                        .permitAll()
                        // Spring Boot's fallback error page, used if something fails outside MVC.
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())

                // 2. CSRF protection for a single-page app. The server sets a readable
                //    XSRF-TOKEN cookie; Angular's HttpClient copies it into an X-XSRF-TOKEN
                //    header on POST/PATCH/DELETE. Another site cannot read our cookie, so it
                //    cannot forge the header. Requests without it are rejected with 403.
                .csrf(csrf -> csrf.spa().csrfTokenRepository(csrfTokens))

                // 3. POST /api/accounts/logout ends the session (also in PostgreSQL), and
                //    Spring Session expires the cookie. Logout also deletes the CSRF token, so
                //    the answer carries a new one: otherwise signing in again straight away
                //    would be rejected for lacking a token. Answers 204 instead of redirecting.
                .logout(logout -> logout
                        .logoutUrl("/api/accounts/logout")
                        .logoutSuccessHandler((request, response, authentication) -> {
                            csrfTokens.saveToken(csrfTokens.generateToken(request), request, response);
                            response.setStatus(HttpStatus.NO_CONTENT.value());
                        }))

                // 4. By default Spring remembers a rejected request in the session, to redirect
                //    back after a login page. An API has no login page, so do not create
                //    sessions for anonymous callers.
                .requestCache(cache -> cache.disable())

                // 5. Answer "not signed in" (401) and "forbidden" (403) with JSON problem
                //    details instead of Spring's defaults.
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(problems)
                        .accessDeniedHandler(problems));

        // Not configured, so off: form login pages, HTTP Basic, remember-me cookies.
        // On by default: security headers (no-store caching, nosniff, frame denial, ...).
        return http.build();
    }

    /** Argon2id, the algorithm the Node API also uses. */
    @Bean
    PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    /**
     * What AccountsController calls to check an email and password. DaoAuthenticationProvider
     * loads the account through the UserDetailsService (AccountUserDetailsService) and compares
     * the password with the stored hash.
     */
    @Bean
    AuthenticationManager authenticationManager(UserDetailsService accounts, PasswordEncoder passwordEncoder) {
        var provider = new DaoAuthenticationProvider(accounts);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}

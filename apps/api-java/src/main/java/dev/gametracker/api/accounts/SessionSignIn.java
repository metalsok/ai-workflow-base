package dev.gametracker.api.accounts;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

/**
 * Remembers a signed-in user in a brand new session.
 *
 * <p>Spring Security's built-in form login would do this for us, but it expects form fields
 * and redirects. Our API takes JSON and answers with JSON, so the controller authenticates
 * and then stores the result here, the way the Spring Security docs describe for custom
 * login endpoints.
 */
@Component
class SessionSignIn {

    private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();
    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

    void signIn(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        // A new session id on every sign-in, so a cookie from before cannot be reused
        // (protection against session fixation).
        var previous = request.getSession(false);
        if (previous != null) {
            previous.invalidate();
        }
        var context = contextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        contextHolder.setContext(context);
        // Writes the context into the (new) session; Spring Session saves it in PostgreSQL.
        contextRepository.saveContext(context, request, response);
    }
}

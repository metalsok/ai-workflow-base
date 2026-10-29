package dev.gametracker.api.shared.web;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

/**
 * Error bodies are RFC 9457 problem details ({@code type, title, status, detail, instance})
 * plus a {@code message} copy of {@code detail}, which the Angular app shows to the user.
 */
public final class ApiProblems {

    private ApiProblems() {}

    public static ProblemDetail of(HttpStatusCode status, String message) {
        return withMessage(ProblemDetail.forStatusAndDetail(status, message));
    }

    static ProblemDetail withMessage(ProblemDetail problem) {
        var properties = problem.getProperties();
        if (properties == null || !properties.containsKey("message")) {
            problem.setProperty("message", problem.getDetail());
        }
        return problem;
    }
}

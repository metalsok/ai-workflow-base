package dev.gametracker.api.shared.web;

import dev.gametracker.api.accounts.EmailAlreadyRegisteredException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns exceptions into JSON error answers, for every controller. {@link
 * ResponseEntityExceptionHandler} already answers Spring MVC's own errors (bad JSON, wrong
 * method, ...) with problem details; this class adds the {@code message} field, friendlier
 * wording, our own exceptions, security errors and a logged catch-all.
 *
 * <p>When several methods match an exception, Spring picks the most specific one: a
 * BadCredentialsException goes to {@link #wrongCredentials}, not {@link #notSignedIn}.
 */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** Bean Validation failed: use the messages written on the request record's annotations. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        exception
                .getBody()
                .setDetail(exception.getFieldErrors().stream()
                        .map(FieldError::getDefaultMessage)
                        .distinct()
                        .collect(Collectors.joining(" ")));
        return super.handleMethodArgumentNotValid(exception, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        var problem = createProblemDetail(
                exception, status, "The request body is missing or is not valid JSON.", null, null, request);
        return handleExceptionInternal(exception, problem, headers, status, request);
    }

    /** Every problem detail produced by the base class passes through here. */
    @Override
    protected ResponseEntity<Object> createResponseEntity(
            Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        if (body instanceof ProblemDetail problem) {
            ApiProblems.withMessage(problem);
        }
        return super.createResponseEntity(body, headers, status, request);
    }

    @ExceptionHandler
    ProblemDetail emailTaken(EmailAlreadyRegisteredException exception) {
        return ApiProblems.of(HttpStatus.CONFLICT, exception.getMessage());
    }

    /** Thrown by Spring Security when login gets a wrong password or an unknown email. */
    @ExceptionHandler
    ProblemDetail wrongCredentials(BadCredentialsException exception) {
        return ApiProblems.of(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
    }

    /** Not signed in. Reaches us through SecurityProblemHandler. */
    @ExceptionHandler
    ProblemDetail notSignedIn(AuthenticationException exception) {
        return ApiProblems.of(HttpStatus.UNAUTHORIZED, "Sign in to continue.");
    }

    @ExceptionHandler
    ProblemDetail missingCsrfToken(CsrfException exception) {
        return ApiProblems.of(HttpStatus.FORBIDDEN, "This request is missing a valid CSRF token.");
    }

    @ExceptionHandler
    ProblemDetail forbidden(AccessDeniedException exception) {
        return ApiProblems.of(HttpStatus.FORBIDDEN, "You are not allowed to do this.");
    }

    /** A bug or an outage. Log it for us; tell the browser nothing internal. */
    @ExceptionHandler
    ProblemDetail unexpected(Exception exception, HttpServletRequest request) {
        log.error("Unhandled error for {} {}", request.getMethod(), request.getRequestURI(), exception);
        return ApiProblems.of(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.");
    }
}

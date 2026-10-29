package dev.gametracker.api.accounts;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Register, sign in and "who am I". Sign-out is handled by Spring Security's logout filter
 * (see SecurityConfiguration), so it has no method here.
 */
@RestController
@RequestMapping("/api/accounts")
class AccountsController {

    private final AccountService accountService;
    private final AuthenticationManager authenticationManager;
    private final SessionSignIn sessionSignIn;

    AccountsController(
            AccountService accountService, AuthenticationManager authenticationManager, SessionSignIn sessionSignIn) {
        this.accountService = accountService;
        this.authenticationManager = authenticationManager;
        this.sessionSignIn = sessionSignIn;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    AccountResponse register(
            @Valid @RequestBody CredentialsRequest body, HttpServletRequest request, HttpServletResponse response) {
        var account = accountService.register(body.email(), body.password());
        var signedIn = SignedInAccount.of(account);
        sessionSignIn.signIn(
                UsernamePasswordAuthenticationToken.authenticated(signedIn, null, signedIn.getAuthorities()),
                request,
                response);
        return AccountResponse.from(signedIn);
    }

    /** A wrong password or unknown email throws BadCredentialsException, answered with 401. */
    @PostMapping("/login")
    AccountResponse login(
            @Valid @RequestBody CredentialsRequest body, HttpServletRequest request, HttpServletResponse response) {
        var authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(body.email(), body.password()));
        sessionSignIn.signIn(authentication, request, response);
        return AccountResponse.from((SignedInAccount) authentication.getPrincipal());
    }

    /** Only reachable when signed in; Spring Security answers 401 otherwise. */
    @GetMapping("/me")
    AccountResponse me(@AuthenticationPrincipal SignedInAccount account) {
        return AccountResponse.from(account);
    }
}

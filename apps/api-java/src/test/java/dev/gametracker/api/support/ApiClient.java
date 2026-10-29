package dev.gametracker.api.support;

import java.io.IOException;
import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Talks to the running API over real HTTP, like the browser does. It keeps cookies, and on
 * POST/PATCH/DELETE copies the XSRF-TOKEN cookie into the X-XSRF-TOKEN header, exactly what
 * Angular's HttpClient does.
 */
public final class ApiClient {

    public static final String SESSION_COOKIE = "game_tracker_java.sid";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final HttpClient http = HttpClient.newHttpClient();
    private final String baseUrl;
    private final Map<String, String> cookies = new LinkedHashMap<>();
    private boolean sendCsrfToken = true;

    public ApiClient(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    /** Behave like a forged request from another site, which cannot read our cookies. */
    public ApiClient withoutCsrfToken() {
        sendCsrfToken = false;
        return this;
    }

    public Response get(String path) {
        return send("GET", path, null);
    }

    public Response post(String path, Object body) {
        return send("POST", path, body);
    }

    public Response post(String path) {
        return send("POST", path, null);
    }

    public String cookie(String name) {
        return cookies.get(name);
    }

    public void setCookie(String name, String value) {
        cookies.put(name, value);
    }

    private Response send(String method, String path, Object body) {
        var request = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .method(method, body == null ? BodyPublishers.noBody() : BodyPublishers.ofString(JSON.writeValueAsString(body)))
                .header("Content-Type", "application/json");
        if (!cookies.isEmpty()) {
            request.header("Cookie", cookies.entrySet().stream()
                    .map(cookie -> cookie.getKey() + "=" + cookie.getValue())
                    .collect(Collectors.joining("; ")));
        }
        if (sendCsrfToken && !method.equals("GET") && cookies.containsKey("XSRF-TOKEN")) {
            request.header("X-XSRF-TOKEN", cookies.get("XSRF-TOKEN"));
        }
        try {
            var response = new Response(http.send(request.build(), BodyHandlers.ofString()));
            response.raw().headers().allValues("Set-Cookie").forEach(this::remember);
            return response;
        } catch (IOException | InterruptedException failure) {
            throw new IllegalStateException(failure);
        }
    }

    private void remember(String setCookie) {
        for (var cookie : HttpCookie.parse(setCookie)) {
            if (cookie.getMaxAge() == 0 || cookie.getValue().isEmpty()) {
                cookies.remove(cookie.getName());
            } else {
                cookies.put(cookie.getName(), cookie.getValue());
            }
        }
    }

    public record Response(HttpResponse<String> raw) {

        public int status() {
            return raw.statusCode();
        }

        public JsonNode json() {
            return JSON.readTree(raw.body());
        }

        public String header(String name) {
            return raw.headers().firstValue(name).orElse(null);
        }

        /** The Set-Cookie header for one cookie, or null if this response did not set it. */
        public String setCookie(String name) {
            return raw.headers().allValues("Set-Cookie").stream()
                    .filter(header -> header.startsWith(name + "="))
                    .findFirst()
                    .orElse(null);
        }
    }
}

package dev.gametracker.api;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * A {@code postgresql://user:password@host:port/database} URL split into what JDBC needs.
 */
record DatabaseUrl(String jdbcUrl, String username, String password) {

    static DatabaseUrl parse(String url) {
        var uri = URI.create(url);
        if (!"postgresql".equals(uri.getScheme()) && !"postgres".equals(uri.getScheme())) {
            throw new IllegalArgumentException("DATABASE_URL must start with postgresql://");
        }
        var userInfo = uri.getRawUserInfo() == null ? "" : uri.getRawUserInfo();
        var separator = userInfo.indexOf(':');
        var username = separator < 0 ? userInfo : userInfo.substring(0, separator);
        var password = separator < 0 ? "" : userInfo.substring(separator + 1);
        var port = uri.getPort() < 0 ? 5432 : uri.getPort();
        var query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
        return new DatabaseUrl(
                "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getRawPath() + query,
                decode(username),
                decode(password));
    }

    Map<String, Object> asSpringProperties() {
        return Map.of(
                "spring.datasource.url", jdbcUrl,
                "spring.datasource.username", username,
                "spring.datasource.password", password);
    }

    /** Never print the password, e.g. in a startup failure message. */
    @Override
    public String toString() {
        return "DatabaseUrl[" + jdbcUrl + ", username=" + username + "]";
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}

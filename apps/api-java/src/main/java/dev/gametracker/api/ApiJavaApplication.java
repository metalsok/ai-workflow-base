package dev.gametracker.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ApiJavaApplication {

    public static void main(String[] args) {
        var application = new SpringApplication(ApiJavaApplication.class);
        // The Node API and Docker use DATABASE_URL; Spring wants separate datasource properties.
        // Default properties have the lowest precedence, so SPRING_DATASOURCE_* still wins.
        var databaseUrl = System.getenv("DATABASE_URL");
        if (databaseUrl != null && !databaseUrl.isBlank()) {
            application.setDefaultProperties(DatabaseUrl.parse(databaseUrl).asSpringProperties());
        }
        application.run(args);
    }
}

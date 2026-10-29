package dev.gametracker.api;

import org.springframework.boot.SpringApplication;

/** Runs the API locally against a throwaway PostgreSQL: {@code ./mvnw spring-boot:test-run}. */
public class TestApiJavaApplication {

    public static void main(String[] args) {
        SpringApplication.from(ApiJavaApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}

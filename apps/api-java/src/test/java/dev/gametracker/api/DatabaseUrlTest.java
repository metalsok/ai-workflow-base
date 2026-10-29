package dev.gametracker.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class DatabaseUrlTest {

    @Test
    void splitsAPostgresUrlIntoJdbcSettings() {
        var url = DatabaseUrl.parse("postgresql://game_tracker:p%40ss%3Aword@127.0.0.1:5433/game_tracker_java");

        assertThat(url.jdbcUrl()).isEqualTo("jdbc:postgresql://127.0.0.1:5433/game_tracker_java");
        assertThat(url.username()).isEqualTo("game_tracker");
        assertThat(url.password()).isEqualTo("p@ss:word");
        assertThat(url.toString()).doesNotContain("p@ss");
    }

    @Test
    void defaultsThePortAndKeepsQueryOptions() {
        var url = DatabaseUrl.parse("postgres://user:secret@db/app?sslmode=require");

        assertThat(url.jdbcUrl()).isEqualTo("jdbc:postgresql://db:5432/app?sslmode=require");
    }

    @Test
    void rejectsOtherDatabases() {
        assertThatThrownBy(() -> DatabaseUrl.parse("mysql://user:secret@db/app"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

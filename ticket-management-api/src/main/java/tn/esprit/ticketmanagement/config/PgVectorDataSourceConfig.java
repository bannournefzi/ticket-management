package tn.esprit.ticketmanagement.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import javax.sql.DataSource;

@Slf4j
@Configuration
public class PgVectorDataSourceConfig {

    @PostConstruct
    public void init() {
        log.info("[DIAG] PgVectorDataSourceConfig loaded");
    }

    // ===== MAIN datasource (port 5432) =====
    @Bean
    @Primary
    public DataSource mainDataSource(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {
        log.info("[DIAG] Creating mainDataSource: {}", url);
        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }

    // ===== PGVECTOR datasource (port 5433) =====
    @Bean(name = "pgVectorDataSource")
    public DataSource pgVectorDataSource(
            @Value("${pgvector.datasource.url}") String url,
            @Value("${pgvector.datasource.username}") String username,
            @Value("${pgvector.datasource.password}") String password) {
        log.info("[DIAG] Creating pgVectorDataSource: {}", url);
        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }

    @Bean(name = "pgVectorJdbcTemplate")
    public JdbcTemplate pgVectorJdbcTemplate(
            @Qualifier("pgVectorDataSource") DataSource dataSource) {
        log.info("[DIAG] Creating pgVectorJdbcTemplate");
        return new JdbcTemplate(dataSource);
    }

    @Bean
    public PgVectorStore vectorStore(
            EmbeddingModel embeddingModel,
            @Qualifier("pgVectorJdbcTemplate") JdbcTemplate jdbcTemplate) {
        log.info("[DIAG] Creating PgVectorStore: dims=768, distance=COSINE, initSchema=false");
        log.info("[DIAG]   embeddingModel class: {}", embeddingModel.getClass().getName());
        log.info("[DIAG]   jdbcTemplate class: {}", jdbcTemplate.getClass().getName());
        return PgVectorStore.builder(jdbcTemplate, embeddingModel)
                .dimensions(768)
                .distanceType(PgVectorStore.PgDistanceType.COSINE_DISTANCE)
                .initializeSchema(false)
                .build();
    }

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        log.info("[DIAG] Creating ChatClient");
        return builder.build();
    }
}
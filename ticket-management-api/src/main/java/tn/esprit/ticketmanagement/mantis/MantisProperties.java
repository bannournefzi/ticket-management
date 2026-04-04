package tn.esprit.ticketmanagement.mantis;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "application.mantis")
public class MantisProperties {
    private String baseUrl;
    private String apiToken;
    private Long projectId;
}
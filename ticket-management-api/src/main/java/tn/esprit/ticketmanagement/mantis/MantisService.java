package tn.esprit.ticketmanagement.mantis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class MantisService {

    private final MantisProperties mantisProperties;
    private final RestTemplate restTemplate;

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", mantisProperties.getApiToken());
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    // We will add createIssue(), updateIssue() etc. in Phase 2
}
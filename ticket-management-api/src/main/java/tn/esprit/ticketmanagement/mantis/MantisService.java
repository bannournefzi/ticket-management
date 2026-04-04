package tn.esprit.ticketmanagement.mantis;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import tn.esprit.ticketmanagement.mantis.dto.MantisIssueRequest;
import tn.esprit.ticketmanagement.mantis.dto.MantisIssueResponse;

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

    public Long createIssue(String title, String description) {
        String url = mantisProperties.getBaseUrl() + "/api/rest/issues";

        MantisIssueRequest request = MantisIssueRequest.builder()
                .summary(title)
                .description(description)
                .project(MantisIssueRequest.MantisRef.builder()
                        .id(mantisProperties.getProjectId())
                        .build())
                .category(MantisIssueRequest.MantisRef.builder()
                        .name("General")
                        .build())
                .build();

        try {
            HttpEntity<MantisIssueRequest> entity = new HttpEntity<>(request, buildHeaders());
            ResponseEntity<MantisIssueResponse> response =
                    restTemplate.exchange(url, HttpMethod.POST, entity, MantisIssueResponse.class);

            if (!response.getStatusCode().is2xxSuccessful()
                    || response.getBody() == null
                    || response.getBody().getIssue() == null
                    || response.getBody().getIssue().getId() == null) {
                throw new IllegalStateException("Mantis create issue returned empty body");
            }

            return response.getBody().getIssue().getId();

        } catch (RestClientResponseException ex) {
            log.error("Mantis error {}: {}", ex.getRawStatusCode(), ex.getResponseBodyAsString());
            throw ex;
        }
    }

    @PostConstruct
    public void checkMantisConfig() {
        log.info("Mantis baseUrl={}, projectId={}, tokenPresent={}",
                mantisProperties.getBaseUrl(),
                mantisProperties.getProjectId(),
                mantisProperties.getApiToken() != null && !mantisProperties.getApiToken().isBlank());
    }

    public void uploadIssueAttachment(Long mantisIssueId, String fileName, String contentType, byte[] data) {
        String url = mantisProperties.getBaseUrl() + "/api/rest/issues/" + mantisIssueId + "/files";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", mantisProperties.getApiToken());
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ByteArrayResource fileResource = new ByteArrayResource(data) {
            @Override
            public String getFilename() {
                return fileName != null && !fileName.isBlank() ? fileName : "attachment.bin";
            }
        };

        HttpHeaders fileHeaders = new HttpHeaders();
        if (contentType != null && !contentType.isBlank()) {
            fileHeaders.setContentType(MediaType.parseMediaType(contentType));
        } else {
            fileHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        }

        HttpEntity<ByteArrayResource> fileEntity = new HttpEntity<>(fileResource, fileHeaders);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileEntity);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = new RestTemplate().exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Mantis attachment upload failed: HTTP " + response.getStatusCode());
        }
    }
}
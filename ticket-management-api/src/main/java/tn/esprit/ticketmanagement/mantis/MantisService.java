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

import java.util.*;
import java.util.stream.Collectors;

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

        // 1. Mantis API expects JSON, not Multipart
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", mantisProperties.getApiToken());
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 2. Encode the file byte array into a Base64 string
        String base64Content = java.util.Base64.getEncoder().encodeToString(data);
        String safeFileName = (fileName != null && !fileName.isBlank()) ? fileName : "attachment.bin";

        // 3. Build the exact JSON structure Mantis expects
        /*
          {
            "files": [
              {
                "name": "filename.txt",
                "content": "base64encodedstring..."
              }
            ]
          }
        */
        Map<String, Object> fileObject = new HashMap<>();
        fileObject.put("name", safeFileName);
        fileObject.put("content", base64Content);

        Map<String, Object> payload = new HashMap<>();
        payload.put("files", List.of(fileObject));

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        // 4. Send the POST request to Mantis
        ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Mantis attachment upload failed: HTTP " + response.getStatusCode());
        }
    }

    public boolean userExists(String username) {
        log.info("Checking if user exists in MantisBT: {}", username);
        
        try {
            // Try to get issues where this user is the reporter
            // This is a workaround since MantisBT doesn't have a direct user search endpoint
            String url = mantisProperties.getBaseUrl() + "/api/rest/issues?page_size=1";
            
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                // First, try to get current user's info
                return checkCurrentUser(username);
            }
            
            log.info("User {} NOT found in MantisBT", username);
            return false;
            
        } catch (RestClientResponseException ex) {
            log.warn("Mantis API error checking user {}: {} - {}", username, ex.getRawStatusCode(), ex.getResponseBodyAsString());
            return false;
        }
    }

    private boolean checkCurrentUser(String username) {
        try {
            String url = mantisProperties.getBaseUrl() + "/api/rest/users/me";
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String body = response.getBody();
                log.debug("Current user response: {}", body.substring(0, Math.min(200, body.length())));
                
                if (body.contains("\"username\":\"" + username + "\"")) {
                    log.info("User {} found (current user)", username);
                    return true;
                }
                
                if (body.contains("\"name\":\"" + username + "\"")) {
                    log.info("User {} found (by name)", username);
                    return true;
                }
            }
            return false;
        } catch (RestClientResponseException ex) {
            log.warn("Could not get current user: {}", ex.getRawStatusCode());
            return false;
        }
    }

    public List<String> getAllUsernames() {
        log.info("Fetching all user usernames from MantisBT");
        Set<String> usernames = new LinkedHashSet<>();
        
        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            
            // Get users from issues (reporter + handler)
            int page = 1;
            int pageSize = 100;
            boolean hasMore = true;
            int maxPages = 20;
            
            while (hasMore && page <= maxPages) {
                String url = mantisProperties.getBaseUrl() + "/api/rest/issues?page_size=" + pageSize + "&page=" + page;
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String body = response.getBody();
                    
                    // Extract reporters (people who created issues)
                    java.util.regex.Pattern reporterPattern = java.util.regex.Pattern.compile("\"reporter\"\\s*:\\s*\\{[^}]*\"name\"\\s*:\\s*\"([^\"]+)\"");
                    java.util.regex.Matcher matcher = reporterPattern.matcher(body);
                    while (matcher.find()) {
                        String username = matcher.group(1);
                        if (username != null && !username.isBlank()) {
                            usernames.add(username);
                        }
                    }
                    
                    // Extract handlers (people assigned to issues)
                    java.util.regex.Pattern handlerPattern = java.util.regex.Pattern.compile("\"handler\"\\s*:\\s*\\{[^}]*\"name\"\\s*:\\s*\"([^\"]+)\"");
                    java.util.regex.Matcher handlerMatcher = handlerPattern.matcher(body);
                    while (handlerMatcher.find()) {
                        String username = handlerMatcher.group(1);
                        if (username != null && !username.isBlank()) {
                            usernames.add(username);
                        }
                    }
                    
                    if (!body.contains("\"issues\"") || body.contains("\"issues\":[]") || body.length() < 50) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }
            
            log.info("Total found {} unique usernames from MantisBT", usernames.size());
            return new ArrayList<>(usernames);
            
        } catch (RestClientResponseException ex) {
            log.error("Failed to fetch users from MantisBT: {} - {}", ex.getRawStatusCode(), ex.getResponseBodyAsString());
            return new ArrayList<>();
        }
    }
    
    public Map<String, String> getUserDetails(String username) {
        log.info("Fetching details for user: {}", username);
        Map<String, String> details = new HashMap<>();
        
        try {
            // Try to find user by getting issues where they are reporter or handler
            int page = 1;
            int pageSize = 50;
            boolean found = false;
            
            while (!found && page <= 3) {
                String url = mantisProperties.getBaseUrl() + "/api/rest/issues?page_size=" + pageSize + "&page=" + page;
                HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String body = response.getBody();
                    
                    // Look for the user in reporters
                    String reporterRegex = "\"reporter\"\\s*:\\s*\\{[^}]*\"name\"\\s*:\\s*\"" + username + "\"[^}]*\"real_name\"\\s*:\\s*\"([^\"]*)\"[^}]*\"email\"\\s*:\\s*\"([^\"]*)\"";
                    java.util.regex.Pattern reporterDetailPattern = java.util.regex.Pattern.compile(reporterRegex);
                    java.util.regex.Matcher reporterMatcher = reporterDetailPattern.matcher(body);
                    
                    if (reporterMatcher.find()) {
                        String realName = reporterMatcher.group(1);
                        String email = reporterMatcher.group(2);
                        if (realName != null && !realName.isBlank()) {
                            details.put("realName", realName);
                        }
                        if (email != null && !email.isBlank()) {
                            details.put("email", email);
                        }
                        found = true;
                    }
                    
                    // Look for the user in handlers
                    if (!found) {
                        String handlerRegex = "\"handler\"\\s*:\\s*\\{[^}]*\"name\"\\s*:\\s*\"" + username + "\"[^}]*\"real_name\"\\s*:\\s*\"([^\"]*)\"[^}]*\"email\"\\s*:\\s*\"([^\"]*)\"";
                        java.util.regex.Pattern handlerDetailPattern = java.util.regex.Pattern.compile(handlerRegex);
                        java.util.regex.Matcher handlerMatcher = handlerDetailPattern.matcher(body);
                        
                        if (handlerMatcher.find()) {
                            String realName = handlerMatcher.group(1);
                            String email = handlerMatcher.group(2);
                            if (realName != null && !realName.isBlank()) {
                                details.put("realName", realName);
                            }
                            if (email != null && !email.isBlank()) {
                                details.put("email", email);
                            }
                            found = true;
                        }
                    }
                    
                    if (!body.contains("\"issues\"") || body.contains("\"issues\":[]")) {
                        break;
                    }
                    page++;
                } else {
                    break;
                }
            }
            
            log.info("User details for {}: {}", username, details);
            return details;
            
        } catch (RestClientResponseException ex) {
            log.error("Failed to fetch user details: {}", ex.getRawStatusCode());
            return details;
        }
    }

    public int getUnassignedIssuesCount(String username) {
        log.info("Fetching unassigned issues count for user: {}", username);
        
        try {
            int count = 0;
            int page = 1;
            int pageSize = 100;
            boolean hasMore = true;
            int maxPages = 10;
            
            while (hasMore && page <= maxPages) {
                String url = mantisProperties.getBaseUrl() + "/api/rest/issues?page_size=" + pageSize + "&page=" + page;
                HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String body = response.getBody();
                    
                    // Look for issues where this user is the handler
                    String handlerRegex = "\"handler\"\\s*:\\s*\\{[^}]*\"name\"\\s*:\\s*\"" + username + "\"";
                    java.util.regex.Pattern handlerPattern = java.util.regex.Pattern.compile(handlerRegex);
                    java.util.regex.Matcher handlerMatcher = handlerPattern.matcher(body);
                    
                    while (handlerMatcher.find()) {
                        // Get the issue around this handler to check status
                        int start = Math.max(0, handlerMatcher.start() - 200);
                        int end = Math.min(body.length(), handlerMatcher.end() + 100);
                        String issueContext = body.substring(start, end);
                        
                        // Check if issue is not resolved/closed
                        if (!issueContext.contains("\"name\":\"resolved\"") && 
                            !issueContext.contains("\"name\":\"closed\"")) {
                            count++;
                        }
                    }
                    
                    if (!body.contains("\"issues\"") || body.contains("\"issues\":[]")) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }
            
            log.info("User {} has {} unassigned issues", username, count);
            return count;
            
        } catch (RestClientResponseException ex) {
            log.error("Failed to fetch unassigned issues: {}", ex.getRawStatusCode());
            return 0;
        }
    }

    public boolean checkUserExistsInMantis(String username) {
        log.info("Checking if user exists in MantisBT: {}", username);
        
        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            
            // Method 1: Check project memberships
            try {
                String projectUrl = mantisProperties.getBaseUrl() + "/api/rest/projects/" + mantisProperties.getProjectId() + "/memberships";
                ResponseEntity<String> projectResponse = restTemplate.exchange(projectUrl, HttpMethod.GET, entity, String.class);
                if (projectResponse.getStatusCode().is2xxSuccessful() && projectResponse.getBody() != null) {
                    String body = projectResponse.getBody();
                    log.debug("Project memberships response: {}", body.substring(0, Math.min(500, body.length())));
                    
                    // Look for "name":"username" pattern anywhere in the response
                    if (body.matches(".*\"name\"\\s*:\\s*\"" + username + "\".*")) {
                        log.info("User {} found in project memberships", username);
                        return true;
                    }
                }
            } catch (RestClientResponseException ex) {
                log.warn("Could not check project memberships: {}", ex.getRawStatusCode());
            }
            
            // Method 2: Check issues (reporter and handler)
            int page = 1;
            int pageSize = 50;
            boolean hasMore = true;
            
            while (hasMore && page <= 5) {
                String url = mantisProperties.getBaseUrl() + "/api/rest/issues?page_size=" + pageSize + "&page=" + page;
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String body = response.getBody();
                    
                    // Look for "name":"username" anywhere in the JSON
                    if (body.matches(".*\"name\"\\s*:\\s*\"" + username + "\".*")) {
                        log.info("User {} found in issues", username);
                        return true;
                    }
                    
                    if (!body.contains("\"issues\"") || body.contains("\"issues\":[]")) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }
            
            log.info("User {} NOT found in MantisBT", username);
            return false;
            
        } catch (RestClientResponseException ex) {
            log.error("Error checking user existence: {}", ex.getRawStatusCode());
            return false;
        }
    }

    public void addNoteToIssue(Long mantisIssueId, String noteText) {
        String url = mantisProperties.getBaseUrl() + "/api/rest/issues/" + mantisIssueId + "/notes";

        // Construction du JSON demandé par l'API Mantis : {"text": "...", "view_state": {"name": "public"}}
        Map<String, Object> payload = new HashMap<>();
        payload.put("text", noteText);

        Map<String, String> viewState = new HashMap<>();
        viewState.put("name", "public");
        payload.put("view_state", viewState);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, buildHeaders());

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("Erreur HTTP lors de l'ajout du commentaire sur Mantis {}", mantisIssueId);
            } else {
                log.info("Commentaire synchronisé avec succès vers Mantis #{}", mantisIssueId);
            }
        } catch (RestClientResponseException ex) {
            log.error("Erreur de l'API Mantis lors de l'ajout du commentaire {}: {}", ex.getRawStatusCode(), ex.getResponseBodyAsString());
        }
    }
}
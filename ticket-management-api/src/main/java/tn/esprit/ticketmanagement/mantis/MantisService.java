package tn.esprit.ticketmanagement.mantis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.mantis.dto.MantisIssueRequest;
import tn.esprit.ticketmanagement.mantis.dto.MantisIssueResponse;
import tn.esprit.ticketmanagement.mantis.dto.MantisProjectDTO;

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
    public List<MantisProjectDTO> getProjectsForUser(User currentUser) {
        String url = mantisProperties.getBaseUrl() + "/api/rest/projects";
        HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, JsonNode.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return List.of();
        }

        List<MantisProjectDTO> projects = new ArrayList<>();
        JsonNode arr = response.getBody().path("projects");
        if (arr.isArray()) {
            for (JsonNode p : arr) {
                projects.add(new MantisProjectDTO(
                        p.path("id").asLong(),
                        p.path("name").asText()
                ));
            }
        }

        return projects;
    }

    public Long createIssue(String title, String description, Long projectId, String reporterUsername) {
        String url = mantisProperties.getBaseUrl() + "/api/rest/issues";

        // Build the JSON body as raw Maps (NO DTOs — avoids ALL Jackson mapping issues)
        Map<String, Object> project = new HashMap<>();
        project.put("id", projectId);

        Map<String, Object> category = new HashMap<>();
        category.put("name", "General");

        Map<String, Object> issueData = new HashMap<>();
        issueData.put("summary", title);
        issueData.put("description", description);
        issueData.put("project", project);
        issueData.put("category", category);

        Map<String, Object> body = issueData;

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, buildHeaders());

            ObjectMapper mapper = new ObjectMapper();
            log.info(">>> Mantis POST body: {}", mapper.writeValueAsString(body));

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, JsonNode.class);

            int statusCode = response.getStatusCode().value();
            String responseStr = response.getBody() != null ? mapper.writeValueAsString(response.getBody()) : "null";
            log.info(">>> Mantis response status={}, body={}", statusCode, responseStr);

            if (response.getBody() != null) {
                JsonNode issue = response.getBody().get("issue");
                if (issue == null || !issue.has("id")) {
                    issue = response.getBody();
                }
                if (issue != null && issue.has("id")) {
                    Long id = issue.get("id").asLong();
                    log.info(">>> Mantis issue created SUCCESS: id={}", id);
                    return id;
                }
            }

            throw new RuntimeException("Mantis n'a pas retourné d'ID. Status: " + statusCode + ", Response: " + responseStr);

        } catch (RestClientResponseException ex) {
            String errorBody = ex.getResponseBodyAsString();
            log.error(">>> Mantis HTTP error {}: {}", ex.getRawStatusCode(), errorBody);
            throw new RuntimeException("Mantis erreur HTTP " + ex.getRawStatusCode() + ": " + errorBody, ex);
        } catch (Exception ex) {
            log.error(">>> Mantis unexpected error: {}", ex.getMessage(), ex);
            throw new RuntimeException("Erreur inattendue Mantis: " + ex.getMessage(), ex);
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

    public Map<String, Object> getUserDetails(String username) {
        log.info("Fetching details for user: {}", username);
        Map<String, Object> details = new HashMap<>();
        List<String> projects = new ArrayList<>();

        try {
            int page = 1;
            int pageSize = 50;
            boolean found = false;

            while (!found && page <= 3) {
                String url = mantisProperties.getBaseUrl() + "/api/rest/issues?page_size=" + pageSize + "&page=" + page;
                HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String body = response.getBody();

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

                    // Extract ALL unique project names from all issues, not just the first
                    java.util.regex.Pattern projectAllPattern = java.util.regex.Pattern.compile("\"project\"\\s*:\\s*\\{[^}]*\"name\"\\s*:\\s*\"([^\"]+)\"");
                    java.util.regex.Matcher projectAllMatcher = projectAllPattern.matcher(body);
                    while (projectAllMatcher.find()) {
                        String projectName = projectAllMatcher.group(1);
                        if (projectName != null && !projectName.isBlank() && !projects.contains(projectName)) {
                            projects.add(projectName);
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

            // Store the full list of projects
            if (!projects.isEmpty()) {
                details.put("projects", projects);
            } else {
                details.put("projects", List.of("Aucun projet trouvé"));
            }

            log.info("User details for {}: {} ({} projects)", username, details, projects.size());
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
    public List<JsonNode> getMantisNotes(Long mantisIssueId) {
        String url = mantisProperties.getBaseUrl() + "/api/rest/issues/" + mantisIssueId;

        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(response.getBody());
                JsonNode issues = root.path("issues");

                if (issues.isArray() && issues.size() > 0) {
                    JsonNode notes = issues.get(0).path("notes");
                    if (notes.isArray()) {
                        List<JsonNode> notesList = new ArrayList<>();
                        notes.forEach(notesList::add);
                        return notesList;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Impossible de récupérer les notes Mantis #{}: {}", mantisIssueId, e.getMessage());
        }
        return new ArrayList<>();
    }
}
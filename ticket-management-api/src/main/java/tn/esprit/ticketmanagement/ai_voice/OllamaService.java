package tn.esprit.ticketmanagement.ai_voice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class OllamaService {

    private static final Logger log = LoggerFactory.getLogger(OllamaService.class);

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;
    @Getter
    @Setter
    private String[] tags;

    @Value("${ollama.model:qwen3:8b}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public VoiceToTicketResponse structureTicket(String voiceText, String userLanguage) {
        try {
            String prompt = buildPrompt(voiceText);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("prompt", prompt);
            requestBody.put("stream", false);
            requestBody.put("options", Map.of(
                    "temperature", 0.3,
                    "num_predict", 500
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("Calling Ollama at {} with model {}", ollamaBaseUrl, model);

            ResponseEntity<String> response = restTemplate.exchange(
                    ollamaBaseUrl + "/api/generate",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseResponse(response.getBody(), voiceText);
            }

            log.error("Ollama returned non-200: {}", response.getStatusCode());
            return fallbackResponse(voiceText);

        } catch (Exception e) {
            log.error("Error calling Ollama: {}", e.getMessage());
            return fallbackResponse(voiceText);
        }
    }

    private String buildPrompt(String voiceText) {
        return "/no_think\n" +
                "You are a ticket management assistant for Tunisie Telecom.\n" +
                "A user dictated the following message by voice to create a support ticket.\n\n" +
                "Extract and structure the information into a JSON object with these exact fields:\n" +
                "- \"title\": a short professional title (max 80 chars, in French)\n" +
                "- \"description\": a detailed professional description (in French, well formatted)\n" +
                "- \"priority\": one of LOW, MEDIUM, HIGH, CRITICAL\n" +
                "- \"category\": one of BUG, FEATURE_REQUEST, IMPROVEMENT, SUPPORT, DOCUMENTATION, OTHER\n" +
                "- \"tags\": an array of 2-4 relevant tags in French (e.g. [\"portail\", \"urgent\", \"panne\"])\n" +
                "Rules for priority:\n" +
                "- CRITICAL: system down, blocking, production, urgent\n" +
                "- HIGH: important, many users affected, deadline\n" +
                "- MEDIUM: standard request\n" +
                "- LOW: minor, cosmetic\n\n" +
                "Voice transcription: \"" + voiceText + "\"\n\n" +

                "Respond ONLY with a valid JSON object, no explanation, no markdown, no backticks.";
    }

    private VoiceToTicketResponse parseResponse(String responseBody, String originalText) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String generatedText = root.path("response").asText("");

            log.info("Ollama raw response: {}", generatedText);

            generatedText = generatedText.replaceAll("(?s)<think>.*?</think>", "");

            generatedText = generatedText
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            int jsonStart = generatedText.indexOf("{");
            int jsonEnd = generatedText.lastIndexOf("}");

            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                String jsonStr = generatedText.substring(jsonStart, jsonEnd + 1);
                log.info("Extracted JSON: {}", jsonStr);

                JsonNode ticketJson = objectMapper.readTree(jsonStr);

                VoiceToTicketResponse result = new VoiceToTicketResponse();
                result.setTitle(ticketJson.path("title").asText(""));
                result.setDescription(ticketJson.path("description").asText(""));
                result.setPriority(sanitizePriority(ticketJson.path("priority").asText("MEDIUM")));
                result.setCategory(sanitizeCategory(ticketJson.path("category").asText("OTHER")));

                if (ticketJson.has("tags") && ticketJson.get("tags").isArray()) {
                    String[] tags = new String[ticketJson.get("tags").size()];
                    for (int i = 0; i < ticketJson.get("tags").size(); i++) {
                        tags[i] = ticketJson.get("tags").get(i).asText();
                    }
                    result.setTags(tags);
                }

                result.setOriginalText(originalText);
                result.setConfidence(calculateConfidence(result));

                log.info("AI structured ticket: title='{}', priority={}, category={}",
                        result.getTitle(), result.getPriority(), result.getCategory());

                return result;
            }

            log.warn("No JSON found in Ollama response");
            return fallbackResponse(originalText);

        } catch (Exception e) {
            log.error("Error parsing Ollama response: {}", e.getMessage());
            return fallbackResponse(originalText);
        }
    }

    private String sanitizePriority(String priority) {
        String upper = priority.toUpperCase();
        if (upper.equals("LOW") || upper.equals("MEDIUM") || upper.equals("HIGH") || upper.equals("CRITICAL")) {
            return upper;
        }
        return "MEDIUM";
    }

    private String sanitizeCategory(String category) {
        String upper = category.toUpperCase();
        if (upper.equals("BUG") || upper.equals("FEATURE_REQUEST") || upper.equals("IMPROVEMENT")
                || upper.equals("SUPPORT") || upper.equals("DOCUMENTATION") || upper.equals("OTHER")) {
            return upper;
        }
        return "OTHER";
    }

    private double calculateConfidence(VoiceToTicketResponse response) {
        double score = 0.5;
        if (response.getTitle() != null && response.getTitle().length() > 10) score += 0.15;
        if (response.getDescription() != null && response.getDescription().length() > 30) score += 0.15;
        if (response.getCategory() != null && !response.getCategory().equals("OTHER")) score += 0.1;
        return Math.min(score, 1.0);
    }

    private VoiceToTicketResponse fallbackResponse(String originalText) {
        VoiceToTicketResponse response = new VoiceToTicketResponse();
        response.setTitle(originalText.length() > 80 ? originalText.substring(0, 80) : originalText);
        response.setDescription(originalText);
        response.setPriority("MEDIUM");
        response.setCategory("OTHER");
        response.setOriginalText(originalText);
        response.setConfidence(0.2);
        return response;
    }
}
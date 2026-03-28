package tn.esprit.ticketmanagement.ai_voice;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
@Tag(name = "AI - Voice to Ticket")
public class AiController {

    private final OllamaService ollamaService;

    public AiController(OllamaService ollamaService) {
        this.ollamaService = ollamaService;
    }

    @PostMapping("/voice-to-ticket")
    @Operation(summary = "Transform voice transcription into a structured ticket")
    public ResponseEntity<VoiceToTicketResponse> voiceToTicket(
            @RequestBody VoiceToTicketRequest request
    ) {
        if (request.getText() == null || request.getText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String language = request.getLanguage() != null ? request.getLanguage() : "fr";

        VoiceToTicketResponse response = ollamaService.structureTicket(
                request.getText().trim(),
                language
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    @Operation(summary = "Check if AI service is available")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("AI service is running");
    }
}
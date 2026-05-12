package tn.esprit.ticketmanagement.KnowledgeBase.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.KnowledgeBase.service.TroubleshootingAiService;
import tn.esprit.ticketmanagement.KnowledgeBase.dto.AgentResponse;
import tn.esprit.ticketmanagement.KnowledgeBase.UserProblemRequest;
import tn.esprit.ticketmanagement.User.entity.User;

@RestController
@RequestMapping("/troubleshooting-trees") // On garde l'URL pour ne pas casser Angular de suite
@RequiredArgsConstructor
@Tag(name = "Troubleshooting AI Agent", description = "Agent interactif de diagnostic")
public class TroubleshootingTreeController {

    private final TroubleshootingAiService aiService;

    // L'IA remplace tout !
    @PostMapping("/analyze-problem")
    @Operation(summary = "IA : Discuter avec l'agent de diagnostic IT")
    public ResponseEntity<AgentResponse> chatWithAgent(
            @RequestBody UserProblemRequest request,
            @AuthenticationPrincipal User currentUser) {

        // On identifie l'utilisateur pour garder sa conversation en mémoire.
        // S'il n'est pas authentifié, on utilise "anonymous"
        String userId = (currentUser != null) ? currentUser.getId().toString() : "anonymous";

        AgentResponse response = aiService.chatWithUser(userId, request.getUserDescription());
        return ResponseEntity.ok(response);
    }

    // Tu peux laisser getTreeById si tu veux garder les vieux arbres pour consultation
}
package tn.esprit.ticketmanagement.KnowledgeBase.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.KnowledgeBase.service.TroubleshootingAiService;
import tn.esprit.ticketmanagement.KnowledgeBase.dto.TroubleshootingTreeDTO;
import tn.esprit.ticketmanagement.KnowledgeBase.service.TroubleshootingTreeService;
import tn.esprit.ticketmanagement.KnowledgeBase.UserProblemRequest;

import java.util.Map;

@RestController
@RequestMapping("/troubleshooting-trees")
@RequiredArgsConstructor
@Tag(name = "Troubleshooting Trees", description = "Gestion des arbres de diagnostic interactifs")
public class TroubleshootingTreeController {

    private final TroubleshootingTreeService treeService;
    private final TroubleshootingAiService aiService;
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un arbre de diagnostic interactif par son ID")
    public ResponseEntity<TroubleshootingTreeDTO> getTreeById(@PathVariable String id) {
        return ResponseEntity.ok(treeService.getTreeById(id));
    }

    @PostMapping("/analyze-problem")
    @Operation(summary = "IA : Trouver le bon arbre de diagnostic à partir d'un texte")
    public ResponseEntity<Map<String, String>> analyzeProblem(@RequestBody UserProblemRequest request) {
        String matchedTreeId = aiService.findMatchingTreeId(request.getUserDescription());
        return ResponseEntity.ok(Map.of("treeId", matchedTreeId));
    }
}
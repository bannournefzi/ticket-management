package tn.esprit.ticketmanagement.KnowledgeBase;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/troubleshooting-trees")
@RequiredArgsConstructor
@Tag(name = "Troubleshooting Trees", description = "Gestion des arbres de diagnostic interactifs")
public class TroubleshootingTreeController {

    private final TroubleshootingTreeService treeService;

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un arbre de diagnostic interactif par son ID")
    public ResponseEntity<TroubleshootingTreeDTO> getTreeById(@PathVariable String id) {
        return ResponseEntity.ok(treeService.getTreeById(id));
    }
}
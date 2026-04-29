package tn.esprit.ticketmanagement.KnowledgeBase;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TroubleshootingTreeService {

    private final TroubleshootingTreeRepository treeRepository;

    // Récupérer un arbre par son ID
    public TroubleshootingTreeDTO getTreeById(String id) {
        TroubleshootingTree tree = treeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Arbre de diagnostic introuvable avec l'ID : " + id));

        return TroubleshootingTreeDTO.builder()
                .id(tree.getId())
                .title(tree.getTitle())
                .treeJsonContent(tree.getTreeJsonContent())
                .build();
    }
}

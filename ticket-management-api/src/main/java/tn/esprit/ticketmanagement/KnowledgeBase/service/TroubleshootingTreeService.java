package tn.esprit.ticketmanagement.KnowledgeBase.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.KnowledgeBase.TroubleshootingTreeRepository;
import tn.esprit.ticketmanagement.KnowledgeBase.dto.TroubleshootingTreeDTO;
import tn.esprit.ticketmanagement.KnowledgeBase.entity.TroubleshootingTree;

@Service
@RequiredArgsConstructor
public class TroubleshootingTreeService {

    private final TroubleshootingTreeRepository treeRepository;

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

package tn.esprit.ticketmanagement.KnowledgeBase;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.ticketmanagement.KnowledgeBase.entity.TroubleshootingTree;

import java.util.List;

@Repository
public interface TroubleshootingTreeRepository extends JpaRepository<TroubleshootingTree, String> {

    List<TroubleshootingTree> findByActiveTrue();
}
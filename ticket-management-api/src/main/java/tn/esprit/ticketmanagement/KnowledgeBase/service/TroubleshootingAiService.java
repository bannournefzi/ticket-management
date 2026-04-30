package tn.esprit.ticketmanagement.KnowledgeBase.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.KnowledgeBase.TroubleshootingTreeRepository;
import tn.esprit.ticketmanagement.KnowledgeBase.entity.TroubleshootingTree;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TroubleshootingAiService {

    private final ChatClient chatClient;
    private final TroubleshootingTreeRepository treeRepository;

    public TroubleshootingAiService(ChatClient.Builder chatClientBuilder, TroubleshootingTreeRepository treeRepository) {
        this.chatClient = chatClientBuilder.build();
        this.treeRepository = treeRepository;
    }

    public String findMatchingTreeId(String userDescription) {
        List<TroubleshootingTree> activeTrees = treeRepository.findByActiveTrue();

        if (activeTrees.isEmpty()) {
            return "UNKNOWN";
        }

        // 1. Formatage propre du catalogue
        String treesCatalog = activeTrees.stream()
                .map(tree -> "- [" + tree.getId() + "] : " + tree.getDescriptionForAi())
                .collect(Collectors.joining("\n"));

        // 2. Prompt avancé avec la technique du "Few-Shot Prompting" (Exemples)
        String systemPrompt = """
            Tu es un routeur expert pour un centre de support informatique (IT Service Desk).
            Ton unique rôle est d'analyser le problème de l'utilisateur et de renvoyer l'ID exact de l'arbre de diagnostic correspondant.
            
            CATALOGUE DES ARBRES DISPONIBLES :
            %s
            
            EXEMPLES DE RAISONNEMENT (FEW-SHOT) :
            Problème: "Je n'arrive pas à imprimer, ça met bourrage papier."
            Réponse: printer-issue
            
            Problème: "Mon mot de passe est expiré, aidez-moi."
            Réponse: account-locked
            
            Problème: "Le réseau distant Cisco me met une erreur timeout quand je travaille de chez moi."
            Réponse: vpn-issue
            
            Problème: "Mon écran est cassé."
            Réponse: UNKNOWN
            
            RÈGLES STRICTES :
            1. Tu dois répondre UNIQUEMENT par l'ID de l'arbre entre crochets, sans aucun autre mot.
            2. Ne dis pas "Bonjour", ne fais aucune phrase d'explication.
            3. Si le problème ne correspond clairement à aucun arbre du catalogue, réponds exactement UNKNOWN.
            """.formatted(treesCatalog);

        // 3. Exécution
        String aiResponse = chatClient.prompt()
                .system(systemPrompt)
                .user("Problème: " + userDescription + "\nRéponse:")
                .call()
                .content();

        // 4. Nettoyage ultra-sécurisé de la réponse (suppression des espaces et de la ponctuation)
        if (aiResponse != null) {
            String cleanResponse = aiResponse.replaceAll("[^a-zA-Z0-9\\-]", "").trim();

            // Vérification finale : est-ce que l'ID renvoyé existe vraiment dans notre base ?
            boolean isValidId = activeTrees.stream().anyMatch(t -> t.getId().equals(cleanResponse));
            return isValidId ? cleanResponse : "UNKNOWN";
        }

        return "UNKNOWN";
    }
}
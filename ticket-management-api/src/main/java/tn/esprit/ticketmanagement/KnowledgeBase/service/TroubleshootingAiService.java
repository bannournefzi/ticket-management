package tn.esprit.ticketmanagement.KnowledgeBase.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.KnowledgeBase.dto.AgentAction;
import tn.esprit.ticketmanagement.KnowledgeBase.dto.AgentResponse;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class TroubleshootingAiService {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    // ─── TTL Memory ───────────────────────────────────────────────────────────
    // On stocke la session ET son timestamp de dernier accès.
    private static final long SESSION_TTL_MINUTES = 15;

    private record Session(List<Message> messages, Instant lastAccess) {
        Session withAccess() { return new Session(messages, Instant.now()); }
    }

    private final Map<String, Session> chatMemory = new ConcurrentHashMap<>();

    // ─── Nettoyage automatique toutes les 5 minutes ───────────────────────────
    @Scheduled(fixedDelay = 300_000)
    public void evictExpiredSessions() {
        Instant cutoff = Instant.now().minusSeconds(SESSION_TTL_MINUTES * 60);
        int before = chatMemory.size();
        chatMemory.entrySet().removeIf(e -> e.getValue().lastAccess().isBefore(cutoff));
        int removed = before - chatMemory.size();
        if (removed > 0) log.info("Session TTL cleanup: {} sessions removed.", removed);
    }

    // ─── Prompt Système ITIL N1 ───────────────────────────────────────────────
    private static final String SYSTEM_PROMPT = """
        Tu es un Technicien Support IT de Niveau 1, certifié ITIL v4, travaillant dans un centre de service ITSM professionnel.

        TON RÔLE :
        - Diagnostiquer les incidents informatiques en suivant les procédures ITIL standard.
        - Guider l'utilisateur étape par étape, UNE SEULE QUESTION à la fois.
        - Appliquer des solutions techniques précises avant d'escalader.

        PROCÉDURES À APPLIQUER (selon le type de problème) :
        - Réseau/VPN  → vérifier connexion physique, ipconfig /release + /renew, ping 8.8.8.8, netsh winsock reset
        - Logiciel    → vider le cache applicatif, désinstaller/réinstaller, vérifier les droits admin
        - Imprimante  → vider le spooler, supprimer puis re-ajouter l'imprimante, tester en local vs réseau
        - Mot de passe → réinitialisation via AD/portail self-service, vérification du compte verrouillé
        - Lenteur PC  → task manager, désactivation des programmes au démarrage, scan antivirus, vérification RAM/disque

        RÈGLES STRICTES :
        1. Pose UNE question fermée (Oui/Non) ou avec des choix clairs et explicites.
        2. Après 3 tentatives infructueuses OU si le problème requiert une intervention matérielle/admin réseau : action = CREATE_TICKET.
        3. Si la procédure résout le problème : action = RESOLVED.
        4. Sinon : action = CONTINUE.
        5. Les "options" doivent être concrètes, jamais vagues. Ex: ["Oui, ça fonctionne", "Non, toujours le même message", "Je ne sais pas faire"].

        FORMAT DE RÉPONSE : JSON STRICT UNIQUEMENT, AUCUN TEXTE EN DEHORS DU JSON.

        Si action = CONTINUE ou RESOLVED :
        {
          "reply": "Ton message clair et professionnel avec la procédure à tester",
          "options": ["Choix 1", "Choix 2"],
          "action": "CONTINUE"
        }

        Si action = CREATE_TICKET, tu DOIS aussi remplir ticketData :
        {
          "reply": "Ton message expliquant le transfert au niveau 2",
          "options": [],
          "action": "CREATE_TICKET",
          "ticketData": {
            "title": "Titre court du problème (max 80 caractères)",
            "description": "Résumé du diagnostic et des symptômes décrits par l'utilisateur",
            "category": "BUG | FEATURE_REQUEST | IMPROVEMENT | SUPPORT | DOCUMENTATION | OTHER",
            "priority": "LOW | MEDIUM | HIGH | CRITICAL"
          }
        }

        Règles pour ticketData.category : BUG = anomalie, FEATURE_REQUEST = nouvelle fonctionnalité, IMPROVEMENT = amélioration, SUPPORT = demande d'aide, DOCUMENTATION = documentation manquante, OTHER = autre.
        Règles pour ticketData.priority : CRITICAL = incident bloquant, HIGH = fonctionnel mais gênant, MEDIUM = normal, LOW = mineur/esthétique.

        INTERDIT : Aucun texte en dehors du JSON. Aucune balise markdown. Aucun commentaire.
        """;

    public TroubleshootingAiService(ChatClient.Builder chatClientBuilder, ObjectMapper objectMapper) {
        this.chatClient = chatClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    // ─── Point d'entrée principal ─────────────────────────────────────────────
    public AgentResponse chatWithUser(String userId, String userMessageText) {

        // 1. Charger ou créer la session (avec refresh du TTL)
        Session session = chatMemory.compute(userId, (k, existing) -> {
            if (existing == null) {
                List<Message> init = new ArrayList<>();
                init.add(new SystemMessage(SYSTEM_PROMPT));
                return new Session(init, Instant.now());
            }
            return existing.withAccess();
        });

        List<Message> history = session.messages();
        history.add(new UserMessage(userMessageText));

        // 2. Appel IA avec mécanisme de retry (max 2 tentatives)
        AgentResponse response = callWithRetry(history, 2);

        // 3. Sauvegarder la réponse dans l'historique
        history.add(new AssistantMessage(response.getReply()));

        // 4. Nettoyer la session si terminée
        if (response.getAction() != AgentAction.CONTINUE) {
            chatMemory.remove(userId);
            log.info("Session {} closed with action: {}", userId, response.getAction());
        }

        return response;
    }

    // ─── Retry robuste ────────────────────────────────────────────────────────
    private AgentResponse callWithRetry(List<Message> history, int maxRetries) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String rawResponse = chatClient.prompt()
                        .messages(history)
                        .call()
                        .content();

                String cleaned = cleanJsonResponse(rawResponse);
                return parseResponse(cleaned);

            } catch (Exception e) {
                log.warn("Tentative {}/{} échouée : {}", attempt, maxRetries, e.getMessage());
                if (attempt == maxRetries) {
                    log.error("Toutes les tentatives ont échoué. Fallback vers CREATE_TICKET.");
                }
            }
        }

        // Fallback sécurisé
        return AgentResponse.builder()
                .reply("Le diagnostic automatique n'a pas pu aboutir. " +
                        "Pour garantir la résolution de votre incident, " +
                        "je vous invite à créer un ticket auprès de notre équipe technique.")
                .action(AgentAction.CREATE_TICKET)
                .options(List.of())
                .build();
    }

    // ─── Parser le JSON de l'IA ───────────────────────────────────────────────
    private AgentResponse parseResponse(String json) throws Exception {
        JsonNode node = objectMapper.readTree(json);

        String reply = node.path("reply").asText("Je n'ai pas compris votre demande. Pouvez-vous reformuler ?");

        // Parsing de l'action avec fallback sécurisé
        AgentAction action;
        try {
            action = AgentAction.valueOf(node.path("action").asText("CONTINUE").toUpperCase());
        } catch (IllegalArgumentException ex) {
            log.warn("Action inconnue reçue de l'IA, fallback CONTINUE");
            action = AgentAction.CONTINUE;
        }

        // Parsing des options (tableau JSON → List<String>)
        List<String> options = new ArrayList<>();
        JsonNode optionsNode = node.path("options");
        if (optionsNode.isArray()) {
            optionsNode.forEach(opt -> options.add(opt.asText()));
        }

        // Parsing de ticketData (optionnel — seulement quand action = CREATE_TICKET)
        AgentResponse.TicketData ticketData = null;
        JsonNode tdNode = node.path("ticketData");
        if (!tdNode.isMissingNode() && tdNode.isObject()) {
            String tdTitle = tdNode.path("title").asText(null);
            String tdDesc = tdNode.path("description").asText(null);
            String tdCat  = tdNode.path("category").asText(null);
            String tdPri  = tdNode.path("priority").asText(null);
            if (tdTitle != null || tdDesc != null || tdCat != null || tdPri != null) {
                ticketData = AgentResponse.TicketData.builder()
                        .title(tdTitle)
                        .description(tdDesc)
                        .category(tdCat)
                        .priority(tdPri)
                        .build();
            }
        }

        return AgentResponse.builder()
                .reply(reply)
                .action(action)
                .options(options)
                .ticketData(ticketData)
                .build();
    }

    // ─── Nettoyage des balises markdown ──────────────────────────────────────
    private String cleanJsonResponse(String response) {
        if (response == null || response.isBlank()) return "{}";
        String cleaned = response.trim();
        // Supprimer les balises ```json ... ```
        if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
        else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length() - 3);
        // Trouver le premier '{' et le dernier '}' pour extraire uniquement le JSON
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return cleaned.substring(start, end + 1).trim();
        }
        return cleaned.trim();
    }
}
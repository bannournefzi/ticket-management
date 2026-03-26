package tn.esprit.ticketmanagement.chatbot;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.User.entity.User;

@RestController
@RequestMapping("/chatbot")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/chat")
    public ResponseEntity<ChatbotResponse> chat(
            @RequestBody ChatbotRequest request,
            @AuthenticationPrincipal User currentUser) {
        String response = chatbotService.chat(request.getMessage(), currentUser);
        return ResponseEntity.ok(new ChatbotResponse(response));
    }

    @PostMapping("/index-tickets")
    public ResponseEntity<String> indexTickets() {
        chatbotService.indexAllTickets();
        return ResponseEntity.ok("All tickets indexed successfully!");
    }
}
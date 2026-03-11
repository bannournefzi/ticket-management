package tn.esprit.ticketmanagement.chat.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.chat.dto.ChatResponse;
import tn.esprit.ticketmanagement.chat.service.ChatService;
import tn.esprit.ticketmanagement.chat.dto.StringResponse;

import java.util.List;

@RestController
@RequestMapping("/chats")
@RequiredArgsConstructor
@Tag(name = "Chat")
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ResponseEntity<StringResponse> createChat(
            @RequestParam(name = "sender-id") Integer senderId,
            @RequestParam(name = "receiver-id") Integer receiverId
    ) {
        final String chatId = chatService.createChat(senderId, receiverId);
        StringResponse response = StringResponse.builder()
                .response(chatId)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ChatResponse>> getChatsByReceiver() {
        return ResponseEntity.ok(chatService.getChatsByReceiverId());
    }

    @DeleteMapping("/{chatId}")
    public ResponseEntity<Void> deleteChat(
            @PathVariable String chatId,
            @AuthenticationPrincipal User currentUser
    ) {
        chatService.deleteChatById(chatId, currentUser.getId());
        return ResponseEntity.ok().build();
    }
}


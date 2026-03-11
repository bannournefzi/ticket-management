package tn.esprit.ticketmanagement.chat.controller;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.ticketmanagement.chat.dto.MessageRequest;
import tn.esprit.ticketmanagement.chat.dto.MessageResponse;
import tn.esprit.ticketmanagement.chat.service.MessageService;

import java.util.List;

@RestController
@RequestMapping("/messages")
@RequiredArgsConstructor
@Tag(name = "Message")
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void saveMessage(@RequestBody MessageRequest message) {
        messageService.saveMessage(message);
    }

    @PostMapping(value = "/upload-media", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public void uploadMedia(
            @RequestParam("chat-id") String chatId,
            @Parameter()
            @RequestPart("file") MultipartFile file
    ) {
        messageService.uploadMediaMessage(chatId, file);
    }

    @PatchMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void setMessageToSeen(@RequestParam("chat-id") String chatId) {
        messageService.setMessagesToSeen(chatId);
    }

    @GetMapping("/chat/{chat-id}")
    public ResponseEntity<List<MessageResponse>> getAllMessages(
            @PathVariable("chat-id") String chatId
    ) {
        return ResponseEntity.ok(messageService.findChatMessages(chatId));
    }
}
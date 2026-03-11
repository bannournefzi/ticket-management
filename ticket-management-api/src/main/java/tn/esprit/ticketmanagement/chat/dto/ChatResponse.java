package tn.esprit.ticketmanagement.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChatResponse {
    private String id;
    private String senderName;
    private String targetName;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private long unreadMessages;
    private String senderId;
    private String recipientId;
}
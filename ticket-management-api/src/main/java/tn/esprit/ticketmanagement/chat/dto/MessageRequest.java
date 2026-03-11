package tn.esprit.ticketmanagement.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.esprit.ticketmanagement.chat.enums.MessageType;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageRequest {
    private String chatId;
    private String content;
    private String senderId;
    private String receiverId;
    private MessageType type;
}
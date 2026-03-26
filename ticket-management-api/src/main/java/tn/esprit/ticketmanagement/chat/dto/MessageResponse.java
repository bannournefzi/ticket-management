package tn.esprit.ticketmanagement.chat.dto;

import lombok.*;
import tn.esprit.ticketmanagement.chat.enums.MessageState;
import tn.esprit.ticketmanagement.chat.enums.MessageType;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageResponse {
    private Long id;
    private String content;
    private String senderId;
    private String receiverId;
    private MessageType type;
    private MessageState state;
    private List<String> media;
    private LocalDateTime createdAt;
}
package tn.esprit.ticketmanagement.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.esprit.ticketmanagement.chat.enums.MessageState;
import tn.esprit.ticketmanagement.chat.enums.MessageType;

import java.time.LocalDateTime;

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
    private String mediaFilePath;
    private LocalDateTime createdDate;
}
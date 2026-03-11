package tn.esprit.ticketmanagement.chat.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.esprit.ticketmanagement.chat.enums.MessageType;
import tn.esprit.ticketmanagement.chat.enums.NotificationType;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Notification {

    private String chatId;
    private String content;
    private String senderId;
    private String receiverId;
    private String chatName;
    private MessageType messageType;
    private NotificationType type;
    private byte[] media;
}
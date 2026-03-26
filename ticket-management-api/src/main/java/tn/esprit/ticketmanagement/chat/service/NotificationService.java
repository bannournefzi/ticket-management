package tn.esprit.ticketmanagement.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.chat.enums.MessageType;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Send message notification
     */
    public void sendMessageNotification(String receiverId, String chatId, String content, String senderId, String chatName) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "MESSAGE");
        payload.put("chatId", chatId);
        payload.put("senderId", senderId);
        payload.put("receiverId", receiverId);
        payload.put("content", content);
        payload.put("chatName", chatName);

        String destination = "/user/" + receiverId + "/chat";
        messagingTemplate.convertAndSend(destination, payload);
        log.info("Message notification sent to {}", destination);
    }

    /**
     * Send seen notification
     */
    public void sendSeenNotification(String receiverId, String chatId, String senderId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "SEEN");
        payload.put("chatId", chatId);
        payload.put("senderId", senderId);
        payload.put("receiverId", receiverId);

        String destination = "/user/" + receiverId + "/chat";
        messagingTemplate.convertAndSend(destination, payload);
        log.info("Seen notification sent to {}", destination);
    }

    /**
     * Send media notification
     */
    public void sendMediaNotification(String receiverId, String chatId, String senderId, String mediaPath, MessageType type) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "IMAGE");
        payload.put("chatId", chatId);
        payload.put("senderId", senderId);
        payload.put("receiverId", receiverId);
        payload.put("content", "📎 Photo");
        payload.put("mediaPath", mediaPath);

        String destination = "/user/" + receiverId + "/chat";
        messagingTemplate.convertAndSend(destination, payload);
        log.info("Media notification sent to {}", destination);
    }
}
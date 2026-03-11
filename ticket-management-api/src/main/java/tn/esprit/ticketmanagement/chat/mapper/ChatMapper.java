package tn.esprit.ticketmanagement.chat.mapper;

import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.chat.dto.ChatResponse;
import tn.esprit.ticketmanagement.chat.entity.Chat;

@Service
public class ChatMapper {

    public ChatResponse toChatResponse(Chat chat, String currentUserId) {
        return ChatResponse.builder()
                .id(chat.getId())
                .senderName(chat.getChatName(currentUserId))
                .targetName(chat.getTargetChatName(currentUserId))
                .lastMessage(chat.getLastMessage())
                .lastMessageTime(chat.getLastMessageTime())
                .unreadMessages(chat.getUnreadMessages(currentUserId))
                .senderId(chat.getSender().getId().toString())
                .recipientId(chat.getRecipient().getId().toString())
                .build();
    }
}
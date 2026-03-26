package tn.esprit.ticketmanagement.chat.mapper;

import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.chat.dto.ChatResponse;
import tn.esprit.ticketmanagement.chat.entity.Conversation;

@Service
public class ChatMapper {

    public ChatResponse toChatResponse(Conversation conversation, String currentUserId) {
        return ChatResponse.builder()
                .id(conversation.getId())
                .senderName(conversation.getChatName(currentUserId))
                .targetName(conversation.getTargetChatName(currentUserId))
                .lastMessage(conversation.getLastMessage())
                .lastMessageTime(conversation.getLastMessageTime())
                .unreadMessages(conversation.getUnreadMessages(currentUserId))
                .senderId(conversation.getSender().getId().toString())
                .recipientId(conversation.getRecipient().getId().toString())
                .build();
    }
}
package tn.esprit.ticketmanagement.chat.mapper;

import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.chat.dto.MessageResponse;
import tn.esprit.ticketmanagement.chat.entity.Message;

import java.util.List;

@Service
public class MessageMapper {

    public MessageResponse toMessageResponse(Message message) {
        // Convert file path to accessible URL
        List<String> media = null;
        if (message.getMediaFilePath() != null && !message.getMediaFilePath().isEmpty()) {
            String mediaUrl = "/messages/media/" + message.getMediaFilePath();
            media = List.of(mediaUrl);
        }

        return MessageResponse.builder()
                .id(message.getId())
                .content(message.getContent())
                .senderId(message.getSenderId())
                .receiverId(message.getReceiverId())
                .type(message.getType())
                .state(message.getState())
                .media(media)
                .createdDate(message.getCreatedDate())
                .build();
    }
}
package tn.esprit.ticketmanagement.chat.mapper;

import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.chat.dto.MessageResponse;
import tn.esprit.ticketmanagement.chat.entity.Message;

@Service
public class MessageMapper {

    public MessageResponse toMessageResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .content(message.getContent())
                .senderId(message.getSenderId())
                .receiverId(message.getReceiverId())
                .type(message.getType())
                .state(message.getState())
                .mediaFilePath(message.getMediaFilePath())
                .createdDate(message.getCreatedDate())
                .build();
    }
}
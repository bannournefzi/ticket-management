package tn.esprit.ticketmanagement.chat.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.chat.dto.MessageRequest;
import tn.esprit.ticketmanagement.chat.dto.MessageResponse;
import tn.esprit.ticketmanagement.chat.entity.Chat;
import tn.esprit.ticketmanagement.chat.entity.Message;
import tn.esprit.ticketmanagement.chat.enums.MessageState;
import tn.esprit.ticketmanagement.chat.enums.MessageType;
import tn.esprit.ticketmanagement.chat.mapper.MessageMapper;
import tn.esprit.ticketmanagement.chat.repository.ChatRepository;
import tn.esprit.ticketmanagement.chat.repository.MessageRepository;

import java.util.List;

// ✅ IMPORTANT: DO NOT have any of these imports:
// import org.hibernate.validator.internal.engine.messageinterpolation.parser.MessageState;
// import java.awt.TrayIcon.MessageType;
// These should NOT be here!

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRepository chatRepository;
    private final UserRepository userRepository;
    private final MessageMapper mapper;
    private final NotificationService notificationService;
    private final FileService fileService;

    @Transactional
    public void saveMessage(MessageRequest messageRequest) {
        Chat chat = chatRepository.findById(messageRequest.getChatId())
                .orElseThrow(() -> new EntityNotFoundException("Chat not found"));

        // ✅ Get sender from authenticated user instead of trusting the request
        User currentUser = getCurrentUser();
        String senderId = currentUser.getId().toString();

        Message message = new Message();
        message.setContent(messageRequest.getContent());
        message.setChat(chat);
        message.setSenderId(senderId);
        message.setReceiverId(messageRequest.getReceiverId());
        message.setType(messageRequest.getType());
        message.setState(MessageState.SENT);

        messageRepository.save(message);
        log.info("Message saved with id: {}", message.getId());

        notificationService.sendMessageNotification(
                messageRequest.getReceiverId(),
                chat.getId(),
                messageRequest.getContent(),
                senderId,
                chat.getTargetChatName(senderId)
        );
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> findChatMessages(String chatId) {
        return messageRepository.findMessagesByChatId(chatId)
                .stream()
                .map(mapper::toMessageResponse)
                .toList();
    }

    @Transactional
    public void setMessagesToSeen(String chatId) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new EntityNotFoundException("Chat not found"));

        User currentUser = getCurrentUser();
        final String recipientId = getRecipientId(chat, currentUser.getId());

        messageRepository.setMessagesToSeenByChatId(chatId, MessageState.SEEN);
        log.info("Messages marked as seen for chat: {}", chatId);

        notificationService.sendSeenNotification(
                recipientId,
                chatId,
                currentUser.getId().toString()
        );
    }

    @Transactional
    public void uploadMediaMessage(String chatId, MultipartFile file) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new EntityNotFoundException("Chat not found"));

        User currentUser = getCurrentUser();
        final String senderId = currentUser.getId().toString();
        final String receiverId = getRecipientId(chat, currentUser.getId());

        final String filePath = fileService.saveFile(file, senderId);

        Message message = new Message();
        message.setReceiverId(receiverId);
        message.setSenderId(senderId);
        message.setState(MessageState.SENT);
        message.setType(MessageType.IMAGE);
        message.setMediaFilePath(filePath);
        message.setChat(chat);

        messageRepository.save(message);
        log.info("Media message saved with path: {}", filePath);

        notificationService.sendMediaNotification(
                receiverId,
                chatId,
                senderId,
                filePath,
                MessageType.IMAGE
        );
    }

    private String getSenderId(Chat chat, User currentUser) {
        if (chat.getSender().getId().equals(currentUser.getId())) {
            return chat.getSender().getId().toString();
        }
        return chat.getRecipient().getId().toString();
    }

    private String getRecipientId(Chat chat, Integer currentUserId) {
        if (chat.getSender().getId().equals(currentUserId)) {
            return chat.getRecipient().getId().toString();
        }
        return chat.getSender().getId().toString();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = extractUsername(authentication);

        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("Current user not found"));
    }

    private String extractUsername(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            return ((UserDetails) authentication.getPrincipal()).getUsername();
        }
        return null;
    }
}
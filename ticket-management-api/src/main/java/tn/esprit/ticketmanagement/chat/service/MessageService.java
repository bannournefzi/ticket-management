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
import tn.esprit.ticketmanagement.chat.entity.Conversation;
import tn.esprit.ticketmanagement.chat.entity.Message;
import tn.esprit.ticketmanagement.chat.enums.MessageState;
import tn.esprit.ticketmanagement.chat.enums.MessageType;
import tn.esprit.ticketmanagement.chat.mapper.MessageMapper;
import tn.esprit.ticketmanagement.chat.repository.ChatRepository;
import tn.esprit.ticketmanagement.chat.repository.MessageRepository;

import java.util.List;

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
        User currentUser = getCurrentUser();
        String senderId = currentUser.getId().toString();
        Integer receiverIdInt = Integer.parseInt(messageRequest.getReceiverId());

        User receiver = userRepository.findById(receiverIdInt)
                .orElseThrow(() -> new EntityNotFoundException("Receiver not found"));

        // ✅ Always resolve by user IDs — never trust the chatId from the request
        Conversation conversation = chatRepository
                .findChatByReceiverAndSender(currentUser.getId(), receiverIdInt)
                .orElseGet(() -> {
                    Conversation newConversation = new Conversation();
                    newConversation.setSender(currentUser);
                    newConversation.setRecipient(receiver);
                    Conversation saved = chatRepository.saveAndFlush(newConversation);
                    log.info("New conversation created: {}", saved.getId());
                    return saved;
                });

        Message message = new Message();
        message.setContent(messageRequest.getContent());
        message.setConversation(conversation);
        message.setSenderId(senderId);
        message.setReceiverId(messageRequest.getReceiverId());
        message.setType(messageRequest.getType());
        message.setState(MessageState.SENT);

        messageRepository.save(message);
        log.info("Message saved: {}", message.getId());

        notificationService.sendMessageNotification(
                messageRequest.getReceiverId(),
                conversation.getId(),
                messageRequest.getContent(),
                senderId,
                conversation.getTargetChatName(senderId)
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
        Conversation conversation = chatRepository.findById(chatId)
                .orElseThrow(() -> new EntityNotFoundException("Chat not found"));

        User currentUser = getCurrentUser();
        final String recipientId = getRecipientId(conversation, currentUser.getId());

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
        Conversation conversation = chatRepository.findById(chatId)
                .orElseThrow(() -> new EntityNotFoundException("Chat not found"));

        User currentUser = getCurrentUser();
        final String senderId = currentUser.getId().toString();
        final String receiverId = getRecipientId(conversation, currentUser.getId());

        final String filePath = fileService.saveFile(file, senderId);

        Message message = new Message();
        message.setReceiverId(receiverId);
        message.setSenderId(senderId);
        message.setState(MessageState.SENT);
        message.setType(MessageType.IMAGE);
        message.setMediaFilePath(filePath);
        message.setConversation(conversation);

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

    private String getRecipientId(Conversation conversation, Integer currentUserId) {
        if (conversation.getSender().getId().equals(currentUserId)) {
            return conversation.getRecipient().getId().toString();
        }
        return conversation.getSender().getId().toString();
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
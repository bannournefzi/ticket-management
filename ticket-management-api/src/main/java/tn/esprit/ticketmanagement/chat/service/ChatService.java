package tn.esprit.ticketmanagement.chat.service;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.chat.repository.MessageRepository;
import tn.esprit.ticketmanagement.chat.dto.ChatResponse;
import tn.esprit.ticketmanagement.chat.entity.Chat;
import tn.esprit.ticketmanagement.chat.mapper.ChatMapper;
import tn.esprit.ticketmanagement.chat.repository.ChatRepository;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;
    private final UserRepository userRepository;
    private final ChatMapper mapper;
    private final MessageRepository messageRepository;

    @Transactional
    public List<ChatResponse> getChatsByReceiverId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = extractUsername(authentication);

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("User with email " + userEmail + " not found"));

        return chatRepository.findChatsBySenderId(currentUser.getId())
                .stream()
                .map(c -> mapper.toChatResponse(c, currentUser.getId().toString()))
                .toList();
    }

    @Transactional
    public String createChat(Integer senderId, Integer receiverId) {
        // Check if chat already exists
        Optional<Chat> existingChat = chatRepository.findChatByReceiverAndSender(senderId, receiverId);
        if (existingChat.isPresent()) {
            log.info("Chat already exists between sender {} and receiver {}", senderId, receiverId);
            return existingChat.get().getId();
        }
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new EntityNotFoundException("Sender with id " + senderId + " not found"));
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new EntityNotFoundException("Receiver with id " + receiverId + " not found"));
        Chat chat = new Chat();
        chat.setSender(sender);
        chat.setRecipient(receiver);

        Chat savedChat = chatRepository.save(chat);
        log.info("New chat created with id: {}", savedChat.getId());
        return savedChat.getId();
    }

    private String extractUsername(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            return ((UserDetails) authentication.getPrincipal()).getUsername();
        }
        return null;
    }


    public void deleteChatById(String chatId, Integer userId) {

        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new EntityNotFoundException("Chat not found"));

        if (!chat.getSender().getId().equals(userId) &&
                !chat.getRecipient().getId().equals(userId)) {

            throw new RuntimeException("Not authorized to delete this chat");
        }

        chatRepository.delete(chat);
    }
}
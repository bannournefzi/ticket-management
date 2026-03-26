package tn.esprit.ticketmanagement.chat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.chat.enums.MessageState;
import tn.esprit.ticketmanagement.chat.enums.MessageType;
import tn.esprit.ticketmanagement.common.BaseAuditingEntity;
import tn.esprit.ticketmanagement.common.ChatConstants;

import java.time.LocalDateTime;
import java.util.List;

import static jakarta.persistence.GenerationType.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "chat")
@NamedQuery(name = ChatConstants.FIND_CHAT_BY_SENDER_ID,
        query = "SELECT DISTINCT c FROM Conversation c WHERE c.sender.id = :senderId OR c.recipient.id = :senderId ORDER BY c.createdDate DESC"
)
@NamedQuery(name = ChatConstants.FIND_CHAT_BY_SENDER_ID_AND_RECEIVER,
        query = "SELECT DISTINCT c FROM Conversation c WHERE (c.sender.id = :senderId AND c.recipient.id = :recipientId) OR (c.sender.id = :recipientId AND c.recipient.id = :senderId) ORDER BY c.createdDate DESC"
)
public class Conversation extends BaseAuditingEntity {

    @Id
    @GeneratedValue(strategy = UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @OneToMany(mappedBy = "conversation", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdDate DESC")
    private List<Message> messages;

    @Transient
    public String getChatName(String senderId) {
        if (senderId == null) return "";

        try {
            Integer senderIdInt = Integer.parseInt(senderId);
            if (recipient != null && recipient.getId() != null && recipient.getId().equals(senderIdInt)) {
                return sender.getFirstName() + " " + sender.getLastName();
            }
            return recipient != null ? (recipient.getFirstName() + " " + recipient.getLastName()) : "";
        } catch (NumberFormatException e) {
            return "";
        }
    }

    @Transient
    public String getTargetChatName(String senderId) {
        if (senderId == null) return "";

        try {
            Integer senderIdInt = Integer.parseInt(senderId);
            if (sender != null && sender.getId() != null && sender.getId().equals(senderIdInt)) {
                return recipient != null ? (recipient.getFirstName() + " " + recipient.getLastName()) : "";
            }
            return sender != null ? (sender.getFirstName() + " " + sender.getLastName()) : "";
        } catch (NumberFormatException e) {
            return "";
        }
    }

    @Transient
    public long getUnreadMessages(String senderId) {
        if (messages == null || messages.isEmpty()) {
            return 0;
        }
        return messages.stream()
                .filter(m -> m.getReceiverId() != null && m.getReceiverId().equals(senderId))
                .filter(m -> m.getState() == MessageState.SENT)
                .count();
    }

    @Transient
    public String getLastMessage() {
        if (messages != null && !messages.isEmpty()) {
            Message lastMsg = messages.get(0);
            if (lastMsg.getType() == MessageType.IMAGE ||
                    lastMsg.getType() == MessageType.VIDEO ||
                    lastMsg.getType() == MessageType.AUDIO) {
                return "Attachment";
            }
            return lastMsg.getContent();
        }
        return null;
    }

    @Transient
    public LocalDateTime getLastMessageTime() {
        if (messages != null && !messages.isEmpty()) {
            return messages.get(0).getCreatedDate();
        }
        return null;
    }
}
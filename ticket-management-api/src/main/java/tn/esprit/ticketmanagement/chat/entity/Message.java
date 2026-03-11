package tn.esprit.ticketmanagement.chat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.esprit.ticketmanagement.chat.enums.MessageState;
import tn.esprit.ticketmanagement.chat.enums.MessageType;
import tn.esprit.ticketmanagement.common.BaseAuditingEntity;
import tn.esprit.ticketmanagement.common.MessageConstants;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "messages")
@NamedQuery(name = MessageConstants.FIND_MESSAGES_BY_CHAT_ID,
        query = "SELECT m FROM Message m WHERE m.chat.id = :chatId ORDER BY m.createdDate DESC"
)
@NamedQuery(name = MessageConstants.SET_MESSAGES_TO_SEEN_BY_CHAT,
        query = "UPDATE Message m SET m.state = :newState WHERE m.chat.id = :chatId"
)
public class Message extends BaseAuditingEntity {

    @Id
    @SequenceGenerator(name = "msg_seq", sequenceName = "msg_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "msg_seq")
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "state")
    private MessageState state;  // DO NOT USE FULL PATH HERE - just MessageState

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private MessageType type;    // DO NOT USE FULL PATH HERE - just MessageType

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private Chat chat;

    @Column(name = "sender_id", nullable = false)
    private String senderId;

    @Column(name = "receiver_id", nullable = false)
    private String receiverId;

    @Column(name = "media_file_path")
    private String mediaFilePath;
}
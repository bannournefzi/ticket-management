package tn.esprit.ticketmanagement.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.ticketmanagement.chat.entity.Chat;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRepository extends JpaRepository<Chat, String> {

    @Query("SELECT DISTINCT c FROM Chat c WHERE c.sender.id = :senderId OR c.recipient.id = :senderId ORDER BY c.createdDate DESC")
    List<Chat> findChatsBySenderId(@Param("senderId") Integer senderId);

    @Query("SELECT c FROM Chat c WHERE (c.sender.id = :senderId AND c.recipient.id = :receiverId) OR (c.sender.id = :receiverId AND c.recipient.id = :senderId)")
    Optional<Chat> findChatByReceiverAndSender(@Param("senderId") Integer senderId, @Param("receiverId") Integer receiverId);

    @Query("SELECT c FROM Chat c WHERE c.sender.id = :userId OR c.recipient.id = :userId")
    List<Chat> findChatsByUserId(@Param("userId") Integer userId);
}
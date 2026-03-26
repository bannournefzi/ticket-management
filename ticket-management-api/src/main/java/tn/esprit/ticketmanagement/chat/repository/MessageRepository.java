package tn.esprit.ticketmanagement.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.ticketmanagement.chat.entity.Message;
import tn.esprit.ticketmanagement.chat.enums.MessageState;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE m.conversation.id = :chatId ORDER BY m.createdDate DESC")
    List<Message> findMessagesByChatId(@Param("chatId") String chatId);

    @Modifying
    @Query("UPDATE Message m SET m.state = :newState WHERE m.conversation.id = :chatId")
    void setMessagesToSeenByChatId(@Param("chatId") String chatId, @Param("newState") MessageState newState);
}
package tn.esprit.ticketmanagement.User.repository;

import org.springframework.data.repository.CrudRepository;
import tn.esprit.ticketmanagement.User.entity.Token;
import tn.esprit.ticketmanagement.User.entity.User;

import java.util.Optional;

public interface TokenRepository extends CrudRepository<Token, Integer> {
    Optional<Token> findByToken(String token);
    void deleteAllByUser(User user);

}

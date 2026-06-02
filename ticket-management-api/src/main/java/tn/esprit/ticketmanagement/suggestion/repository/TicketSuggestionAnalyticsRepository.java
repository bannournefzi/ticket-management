package tn.esprit.ticketmanagement.suggestion.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.ticketmanagement.suggestion.entity.TicketSuggestionAnalytics;

@Repository
public interface TicketSuggestionAnalyticsRepository extends JpaRepository<TicketSuggestionAnalytics, Long> {
}

package tn.esprit.ticketmanagement.settings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
interface SlaConfigRepository extends JpaRepository<SlaConfig, Long> {
    Optional<SlaConfig> findByPriorityLevel(String priorityLevel);
}

@Repository
interface TicketCategoryConfigRepository extends JpaRepository<TicketCategoryConfig, Long> {
    List<TicketCategoryConfig> findAllByOrderByDisplayOrderAsc();
    List<TicketCategoryConfig> findByEnabledTrueOrderByDisplayOrderAsc();
    Optional<TicketCategoryConfig> findByCode(String code);
    boolean existsByCode(String code);
}

@Repository
interface WorkingHoursConfigRepository extends JpaRepository<WorkingHoursConfig, Long> {
    Optional<WorkingHoursConfig> findByDayOfWeek(String dayOfWeek);
}
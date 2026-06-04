package tn.esprit.ticketmanagement.Audit.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.esprit.ticketmanagement.Audit.entity.AuditLog;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    Page<AuditLog> findByUserIdOrderByCreatedDateDesc(Integer userId, Pageable pageable);

    Page<AuditLog> findByUserId(Integer userId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM AuditLog a WHERE a.createdDate < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}

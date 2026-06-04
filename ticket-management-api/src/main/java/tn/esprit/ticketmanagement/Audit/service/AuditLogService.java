package tn.esprit.ticketmanagement.Audit.service;

import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Audit.dto.AuditLogDTO;
import tn.esprit.ticketmanagement.Audit.entity.AuditLog;
import tn.esprit.ticketmanagement.Audit.repository.AuditLogRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(Integer userId, String userFullName, String actionType,
                    String module, String entityType, Long entityId,
                    String details, String ipAddress, String userAgent) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .userFullName(userFullName)
                .actionType(actionType)
                .module(module)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();
        auditLogRepository.save(auditLog);
        log.trace("Audit: user={} action={} module={}", userId, actionType, module);
    }

    public void log(Integer userId, String userFullName, String actionType, String module, String details) {
        log(userId, userFullName, actionType, module, null, null, details, null, null);
    }

    public void log(Integer userId, String userFullName, String actionType, String module,
                    String entityType, Long entityId, String details) {
        log(userId, userFullName, actionType, module, entityType, entityId, details, null, null);
    }

    public Page<AuditLogDTO> getUserHistory(Integer userId, int page, int size, String sortDir) {
        return getUserHistory(userId, page, size, sortDir, null);
    }

    public Page<AuditLogDTO> getUserHistory(Integer userId, int page, int size, String sortDir, String actionType) {
        Sort sort = Sort.by("desc".equalsIgnoreCase(sortDir)
                ? Sort.Direction.DESC : Sort.Direction.ASC, "createdDate");
        Pageable pageable = PageRequest.of(page, size, sort);

        if (actionType == null || actionType.isEmpty()) {
            return auditLogRepository.findByUserId(userId, pageable)
                    .map(this::toDTO);
        }

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));
            predicates.add(cb.equal(root.get("actionType"), actionType));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return auditLogRepository.findAll(spec, pageable).map(this::toDTO);
    }

    public Page<AuditLogDTO> getAllHistory(int page, int size, String sortDir,
                                            Integer userId, String actionType,
                                            LocalDateTime dateFrom, LocalDateTime dateTo,
                                            String module, String keyword) {
        Sort sort = Sort.by("desc".equalsIgnoreCase(sortDir)
                ? Sort.Direction.DESC : Sort.Direction.ASC, "createdDate");
        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (userId != null) {
                predicates.add(cb.equal(root.get("userId"), userId));
            }
            if (actionType != null && !actionType.isEmpty()) {
                predicates.add(cb.equal(root.get("actionType"), actionType));
            }
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdDate"), dateFrom));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdDate"), dateTo));
            }
            if (module != null && !module.isEmpty()) {
                predicates.add(cb.equal(root.get("module"), module));
            }
            if (keyword != null && !keyword.isEmpty()) {
                String pattern = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("details")), pattern),
                        cb.like(cb.lower(root.get("userFullName")), pattern),
                        cb.like(cb.lower(root.get("actionType")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return auditLogRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Scheduled(cron = "0 0 0 * * ?")
    public void cleanupOldRecords() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
        int deleted = auditLogRepository.deleteOlderThan(cutoff);
        if (deleted > 0) {
            log.info("Audit cleanup: deleted {} records older than {}", deleted, cutoff);
        }
    }

    private AuditLogDTO toDTO(AuditLog auditLog) {
        return AuditLogDTO.builder()
                .id(auditLog.getId())
                .userId(auditLog.getUserId())
                .userFullName(auditLog.getUserFullName())
                .actionType(auditLog.getActionType())
                .module(auditLog.getModule())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .details(auditLog.getDetails())
                .ipAddress(auditLog.getIpAddress())
                .userAgent(auditLog.getUserAgent())
                .createdDate(auditLog.getCreatedDate())
                .build();
    }
}

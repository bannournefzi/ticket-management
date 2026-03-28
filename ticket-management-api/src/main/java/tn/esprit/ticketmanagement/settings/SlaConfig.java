package tn.esprit.ticketmanagement.settings;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "sla_config")
@EntityListeners(AuditingEntityListener.class)
public class SlaConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "priority_level", unique = true, nullable = false)
    private String priorityLevel; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "resolution_hours", nullable = false)
    private Integer resolutionHours; // heures pour résoudre

    @Column(name = "first_response_hours")
    private Integer firstResponseHours; // heures pour première réponse

    @LastModifiedDate
    @Column(name = "last_modified_date")
    private LocalDateTime lastModifiedDate;

    @Column(name = "modified_by")
    private String modifiedBy;
}
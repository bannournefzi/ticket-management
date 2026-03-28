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
@Table(name = "ticket_category_config")
@EntityListeners(AuditingEntityListener.class)
public class TicketCategoryConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", unique = true, nullable = false)
    private String code; // BUG, SUPPORT, CUSTOM_1, etc.

    @Column(name = "label", nullable = false)
    private String label; // "Bug", "Support", "Réseau"

    @Column(name = "icon")
    private String icon; // "fas fa-bug"

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @LastModifiedDate
    @Column(name = "last_modified_date")
    private LocalDateTime lastModifiedDate;
}
package tn.esprit.ticketmanagement.settings;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "working_hours_config")
@EntityListeners(AuditingEntityListener.class)
public class WorkingHoursConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "day_of_week", unique = true, nullable = false)
    private String dayOfWeek; // MONDAY, TUESDAY, ... SUNDAY

    @Column(name = "is_working_day", nullable = false)
    private Boolean isWorkingDay = true;

    @Column(name = "start_time")
    private LocalTime startTime; // 08:00

    @Column(name = "end_time")
    private LocalTime endTime; // 17:00

    @LastModifiedDate
    @Column(name = "last_modified_date")
    private LocalDateTime lastModifiedDate;
}
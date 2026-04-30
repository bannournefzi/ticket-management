package tn.esprit.ticketmanagement.Ticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_attachments")
@Access(AccessType.FIELD)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TicketAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Lob
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.BINARY)
    @Column(name = "file_data", nullable = false)
    private byte[] fileData;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;
}

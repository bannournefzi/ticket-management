package tn.esprit.ticketmanagement.Ticket;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class AttachmentDTO {

    private Long id;
    private String fileName;
    private String contentType;
    private Long sizeBytes;
    private LocalDateTime uploadedAt;
}
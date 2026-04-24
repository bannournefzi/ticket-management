package tn.esprit.ticketmanagement.User.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class SessionDTO {
    private Long id;
    private String ipAddress;
    private String deviceOs;
    private String browser;
    private LocalDateTime loginAt;
    private LocalDateTime lastActivityAt;
    private String userFullName; // <--- This is what the Admin needs to see!
    private String userEmail;
}

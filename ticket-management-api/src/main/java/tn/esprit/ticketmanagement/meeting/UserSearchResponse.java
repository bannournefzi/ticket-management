package tn.esprit.ticketmanagement.meeting;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchResponse {
    private Integer id;
    private String fullName;
    private String email;
    private String department;
    private String role;
    private String initials;
}

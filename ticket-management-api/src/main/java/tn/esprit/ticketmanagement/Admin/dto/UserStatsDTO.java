package tn.esprit.ticketmanagement.Admin.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsDTO {
    private long totalUsers;
    private long activeUsers;
    private long inactiveUsers;
    private long metierCount;
    private long itCount;
    private long adminCount;
}

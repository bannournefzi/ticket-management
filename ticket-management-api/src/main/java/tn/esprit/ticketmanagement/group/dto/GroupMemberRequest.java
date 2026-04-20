package tn.esprit.ticketmanagement.group.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupMemberRequest {

    private Long userId;
}
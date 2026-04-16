package tn.esprit.ticketmanagement.KnowledgeBase;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class KnowledgeBaseArticleDTO {

    private Long id;
    private String title;
    private String description;
    private String solution;
    private LocalDateTime createdAt;
    private Integer createdById;
    private String createdByName;
    private Integer ticketId;
}
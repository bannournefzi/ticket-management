package tn.esprit.ticketmanagement.KnowledgeBase.dto;

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
    private String category;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer createdById;
    private String createdByName;
    private Integer updatedById;
    private String updatedByName;
    private Integer ticketId;
    private Integer helpfulCount;
    private Integer notHelpfulCount;
}
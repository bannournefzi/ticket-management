package tn.esprit.ticketmanagement.KnowledgeBase.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TroubleshootingTreeDTO {
    private String id;
    private String title;

    @JsonRawValue // Très important pour que Angular reçoive un vrai objet JSON et non un long String
    private String treeJsonContent;
}

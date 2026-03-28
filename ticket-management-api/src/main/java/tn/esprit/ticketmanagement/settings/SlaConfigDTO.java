package tn.esprit.ticketmanagement.settings;

import lombok.Data;
import java.time.LocalTime;

@Data
public class SlaConfigDTO {
    private String priorityLevel;
    private Integer resolutionHours;
    private Integer firstResponseHours;
}
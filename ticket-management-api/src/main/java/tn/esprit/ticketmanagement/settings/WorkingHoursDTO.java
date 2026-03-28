package tn.esprit.ticketmanagement.settings;

import lombok.Data;
import java.time.LocalTime;

@Data
public class WorkingHoursDTO {
    private String dayOfWeek;
    private Boolean isWorkingDay;
    private LocalTime startTime;
    private LocalTime endTime;
}
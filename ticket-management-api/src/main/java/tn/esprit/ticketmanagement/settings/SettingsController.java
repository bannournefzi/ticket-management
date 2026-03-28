package tn.esprit.ticketmanagement.settings;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/settings")
@RequiredArgsConstructor
@Tag(name = "Settings")
public class SettingsController {

    private final SettingsService settingsService;

    // ══════════════════════════════════════════
    //  SLA CONFIG
    // ══════════════════════════════════════════

    @GetMapping("/sla")
    public ResponseEntity<List<SlaConfig>> getAllSla() {
        return ResponseEntity.ok(settingsService.getAllSlaConfigs());
    }

    @PutMapping("/sla")
    public ResponseEntity<List<SlaConfig>> updateAllSla(
            @RequestBody List<SlaConfigDTO> configs,
            Authentication authentication
    ) {
        String userEmail = authentication.getName();
        return ResponseEntity.ok(settingsService.updateAllSlaConfigs(configs, userEmail));
    }

    @GetMapping("/sla/{priority}")
    public ResponseEntity<Integer> getResolutionHours(@PathVariable String priority) {
        return ResponseEntity.ok(settingsService.getResolutionHours(priority.toUpperCase()));
    }

    // ══════════════════════════════════════════
    //  CATEGORIES
    // ══════════════════════════════════════════

    @GetMapping("/categories")
    public ResponseEntity<List<TicketCategoryConfig>> getAllCategories() {
        return ResponseEntity.ok(settingsService.getAllCategories());
    }

    @GetMapping("/categories/enabled")
    public ResponseEntity<List<TicketCategoryConfig>> getEnabledCategories() {
        return ResponseEntity.ok(settingsService.getEnabledCategories());
    }

    @PostMapping("/categories")
    public ResponseEntity<TicketCategoryConfig> addCategory(@RequestBody TicketCategoryConfig category) {
        return ResponseEntity.ok(settingsService.addCategory(category));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<TicketCategoryConfig> updateCategory(
            @PathVariable Long id,
            @RequestBody TicketCategoryConfig category
    ) {
        return ResponseEntity.ok(settingsService.updateCategory(id, category));
    }

    @PatchMapping("/categories/{id}/toggle")
    public ResponseEntity<Void> toggleCategory(@PathVariable Long id) {
        settingsService.toggleCategory(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        settingsService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // ══════════════════════════════════════════
    //  WORKING HOURS
    // ══════════════════════════════════════════

    @GetMapping("/working-hours")
    public ResponseEntity<List<WorkingHoursConfig>> getAllWorkingHours() {
        return ResponseEntity.ok(settingsService.getAllWorkingHours());
    }

    @PutMapping("/working-hours")
    public ResponseEntity<List<WorkingHoursConfig>> updateWorkingHours(
            @RequestBody List<WorkingHoursDTO> configs
    ) {
        return ResponseEntity.ok(settingsService.updateAllWorkingHours(configs));
    }
}
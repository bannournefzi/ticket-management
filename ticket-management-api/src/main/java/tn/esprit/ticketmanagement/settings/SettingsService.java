package tn.esprit.ticketmanagement.settings;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SettingsService {

    private final SlaConfigRepository slaRepo;
    private final TicketCategoryConfigRepository categoryRepo;
    private final WorkingHoursConfigRepository workingHoursRepo;

    // ══════════════════════════════════════════
    //  INITIALIZATION (default values on first run)
    // ══════════════════════════════════════════

    @PostConstruct
    public void initDefaults() {
        initDefaultSla();
        initDefaultCategories();
        initDefaultWorkingHours();
    }

    private void initDefaultSla() {
        if (slaRepo.count() > 0) return;
        log.info("Initializing default SLA config...");

        Map<String, int[]> defaults = Map.of(
                "LOW", new int[]{72, 24},
                "MEDIUM", new int[]{24, 8},
                "HIGH", new int[]{8, 2},
                "CRITICAL", new int[]{4, 1}
        );

        defaults.forEach((priority, hours) -> {
            SlaConfig config = SlaConfig.builder()
                    .priorityLevel(priority)
                    .resolutionHours(hours[0])
                    .firstResponseHours(hours[1])
                    .modifiedBy("SYSTEM")
                    .build();
            slaRepo.save(config);
        });
    }

    private void initDefaultCategories() {
        if (categoryRepo.count() > 0) return;
        log.info("Initializing default categories...");

        Object[][] defaults = {
                {"BUG", "Bug", "fas fa-bug", 1},
                {"FEATURE_REQUEST", "Fonctionnalité", "fas fa-lightbulb", 2},
                {"IMPROVEMENT", "Amélioration", "fas fa-chart-line", 3},
                {"SUPPORT", "Support", "fas fa-headset", 4},
                {"DOCUMENTATION", "Documentation", "fas fa-book", 5},
                {"OTHER", "Autre", "fas fa-ellipsis-h", 6}
        };

        for (Object[] d : defaults) {
            TicketCategoryConfig cat = TicketCategoryConfig.builder()
                    .code((String) d[0])
                    .label((String) d[1])
                    .icon((String) d[2])
                    .displayOrder((Integer) d[3])
                    .enabled(true)
                    .build();
            categoryRepo.save(cat);
        }
    }

    private void initDefaultWorkingHours() {
        if (workingHoursRepo.count() > 0) return;
        log.info("Initializing default working hours...");

        String[] days = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"};
        for (String day : days) {
            boolean isWorking = !day.equals("SATURDAY") && !day.equals("SUNDAY");
            WorkingHoursConfig wh = WorkingHoursConfig.builder()
                    .dayOfWeek(day)
                    .isWorkingDay(isWorking)
                    .startTime(isWorking ? LocalTime.of(8, 0) : null)
                    .endTime(isWorking ? LocalTime.of(17, 0) : null)
                    .build();
            workingHoursRepo.save(wh);
        }
    }

    // ══════════════════════════════════════════
    //  SLA CONFIG
    // ══════════════════════════════════════════

    public List<SlaConfig> getAllSlaConfigs() {
        return slaRepo.findAll();
    }

    @Transactional
    public SlaConfig updateSlaConfig(String priorityLevel, Integer resolutionHours, Integer firstResponseHours, String modifiedBy) {
        SlaConfig config = slaRepo.findByPriorityLevel(priorityLevel.toUpperCase())
                .orElseThrow(() -> new RuntimeException("SLA config not found for: " + priorityLevel));

        if (resolutionHours != null && resolutionHours > 0) {
            config.setResolutionHours(resolutionHours);
        }
        if (firstResponseHours != null && firstResponseHours > 0) {
            config.setFirstResponseHours(firstResponseHours);
        }
        config.setModifiedBy(modifiedBy);

        return slaRepo.save(config);
    }

    @Transactional
    public List<SlaConfig> updateAllSlaConfigs(List<SlaConfigDTO> configs, String modifiedBy) {
        for (SlaConfigDTO dto : configs) {
            updateSlaConfig(dto.getPriorityLevel(), dto.getResolutionHours(), dto.getFirstResponseHours(), modifiedBy);
        }
        return slaRepo.findAll();
    }

    public Integer getResolutionHours(String priority) {
        return slaRepo.findByPriorityLevel(priority)
                .map(SlaConfig::getResolutionHours)
                .orElse(24);
    }

    // ══════════════════════════════════════════
    //  CATEGORIES
    // ══════════════════════════════════════════

    public List<TicketCategoryConfig> getAllCategories() {
        return categoryRepo.findAllByOrderByDisplayOrderAsc();
    }

    public List<TicketCategoryConfig> getEnabledCategories() {
        return categoryRepo.findByEnabledTrueOrderByDisplayOrderAsc();
    }

    @Transactional
    public TicketCategoryConfig addCategory(TicketCategoryConfig category) {
        if (categoryRepo.existsByCode(category.getCode().toUpperCase())) {
            throw new RuntimeException("Une catégorie avec le code '" + category.getCode() + "' existe déjà");
        }
        category.setCode(category.getCode().toUpperCase());
        category.setEnabled(true);
        if (category.getDisplayOrder() == null) {
            category.setDisplayOrder((int) categoryRepo.count() + 1);
        }
        return categoryRepo.save(category);
    }

    @Transactional
    public TicketCategoryConfig updateCategory(Long id, TicketCategoryConfig update) {
        TicketCategoryConfig existing = categoryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));

        if (update.getLabel() != null) existing.setLabel(update.getLabel());
        if (update.getIcon() != null) existing.setIcon(update.getIcon());
        if (update.getEnabled() != null) existing.setEnabled(update.getEnabled());
        if (update.getDisplayOrder() != null) existing.setDisplayOrder(update.getDisplayOrder());

        return categoryRepo.save(existing);
    }

    @Transactional
    public void toggleCategory(Long id) {
        TicketCategoryConfig cat = categoryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        cat.setEnabled(!cat.getEnabled());
        categoryRepo.save(cat);
    }

    @Transactional
    public void deleteCategory(Long id) {
        categoryRepo.deleteById(id);
    }

    // ══════════════════════════════════════════
    //  WORKING HOURS
    // ══════════════════════════════════════════

    public List<WorkingHoursConfig> getAllWorkingHours() {
        return workingHoursRepo.findAll();
    }

    @Transactional
    public List<WorkingHoursConfig> updateAllWorkingHours(List<WorkingHoursDTO> configs) {
        for (WorkingHoursDTO dto : configs) {
            WorkingHoursConfig wh = workingHoursRepo.findByDayOfWeek(dto.getDayOfWeek().toUpperCase())
                    .orElseThrow(() -> new RuntimeException("Day not found: " + dto.getDayOfWeek()));

            wh.setIsWorkingDay(dto.getIsWorkingDay());
            if (dto.getStartTime() != null) wh.setStartTime(dto.getStartTime());
            if (dto.getEndTime() != null) wh.setEndTime(dto.getEndTime());

            workingHoursRepo.save(wh);
        }
        return workingHoursRepo.findAll();
    }
}
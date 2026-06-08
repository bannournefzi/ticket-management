package tn.esprit.ticketmanagement.Admin;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.Admin.dto.CreateUserRequest;
import tn.esprit.ticketmanagement.Admin.dto.UserDTO;
import tn.esprit.ticketmanagement.Admin.dto.UserStatsDTO;
import tn.esprit.ticketmanagement.Audit.entity.AuditLog;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.User.enums.Departement;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.mantis.MantisService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin")
public class AdminController {

    private final AdminService adminService;
    private final MantisService mantisService;
    private final AuditLogService auditLogService;

    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Integer id) {
        return ResponseEntity.ok(adminService.getUserById(id));
    }

     @PutMapping("/users/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Integer id,
            @RequestBody UserDTO userDTO,
            @AuthenticationPrincipal User admin
    ) {
        UserDTO result = adminService.updateUser(id, userDTO);
        auditLogService.log(admin.getId(), admin.fullName(), AuditLog.ACTION_UPDATE_USER,
                "Admin", "User", id.longValue(),
                "Mise à jour de l'utilisateur #" + id);
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserDTO> updateUserRole(
            @PathVariable Integer id,
            @RequestParam String role,
            @AuthenticationPrincipal User admin
    ) {
        UserDTO result = adminService.updateUserRole(id, role);
        auditLogService.log(admin.getId(), admin.fullName(), AuditLog.ACTION_UPDATE_USER_ROLE,
                "Admin", "User", id.longValue(),
                "Rôle de l'utilisateur #" + id + " changé en " + role);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/users")
    public ResponseEntity<UserDTO> createUser(
            @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal User admin
    ) {
        UserDTO result = adminService.createUser(request);
        auditLogService.log(admin.getId(), admin.fullName(), AuditLog.ACTION_CREATE_USER,
                "Admin", "User", result.getId().longValue(),
                "Création de l'utilisateur " + result.getEmail());
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<UserDTO> toggleUserStatus(
            @PathVariable Integer id,
            @AuthenticationPrincipal User admin
    ) {
        UserDTO result = adminService.toggleUserStatus(id);
        auditLogService.log(admin.getId(), admin.fullName(), AuditLog.ACTION_TOGGLE_USER_STATUS,
                "Admin", "User", id.longValue(),
                "Statut de l'utilisateur #" + id + " basculé");
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Integer id,
            @AuthenticationPrincipal User admin
    ) {
        adminService.deleteUser(id);
        auditLogService.log(admin.getId(), admin.fullName(), AuditLog.ACTION_DELETE_USER,
                "Admin", "User", id.longValue(),
                "Suppression de l'utilisateur #" + id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/stats")
    public ResponseEntity<UserStatsDTO> getUserStats() {
        return ResponseEntity.ok(adminService.getUserStats());
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<UserDTO>> searchUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled
    ) {
        return ResponseEntity.ok(adminService.searchUsers(query, role, enabled));
    }
    @GetMapping("/users/departement/{departement}")
    public ResponseEntity<List<UserDTO>> getUsersByDepartement(
            @PathVariable Departement departement
    ) {
        return ResponseEntity.ok(adminService.getUsersByDepartement(departement));
    }

    // ✅ NOUVEAU : modifier le département d'un user
    @PatchMapping("/users/{id}/departement")
    public ResponseEntity<UserDTO> updateUserDepartement(
            @PathVariable Integer id,
            @RequestParam Departement departement,
            @AuthenticationPrincipal User admin
    ) {
        UserDTO result = adminService.updateUserDepartement(id, departement);
        auditLogService.log(admin.getId(), admin.fullName(), AuditLog.ACTION_UPDATE_USER,
                "Admin", "User", id.longValue(),
                "Département de l'utilisateur #" + id + " changé en " + departement);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/mantis-users")
    public ResponseEntity<List<String>> getMantisUsers() {
        return ResponseEntity.ok(mantisService.getAllUsernames());
    }

    @GetMapping("/mantis-users/details")
    public ResponseEntity<Map<String, Object>> getMantisUsersWithDetails() {
        List<String> usernames = mantisService.getAllUsernames();
        Map<String, Object> usersWithDetails = new HashMap<>();
        
        for (String username : usernames) {
            Map<String, Object> details = mantisService.getUserDetails(username);
            usersWithDetails.put(username, details);
        }
        
        return ResponseEntity.ok(usersWithDetails);
    }

    @GetMapping("/mantis-users/{username}/details")
    public ResponseEntity<Map<String, Object>> getMantisUserDetails(
            @PathVariable String username) {
        return ResponseEntity.ok(mantisService.getUserDetails(username));
    }

    @GetMapping("/mantis-projects")
    public ResponseEntity<List<Map<String, Object>>> getMantisProjects() {
        List<Map<String, Object>> projects = mantisService.getProjectsForUser(null)
                .stream()
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getId());
                    map.put("name", p.getName());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(projects);
    }
}
package tn.esprit.ticketmanagement.Admin;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.Admin.dto.CreateUserRequest;
import tn.esprit.ticketmanagement.Admin.dto.UserDTO;
import tn.esprit.ticketmanagement.Admin.dto.UserStatsDTO;
import tn.esprit.ticketmanagement.User.enums.Departement;
import tn.esprit.ticketmanagement.mantis.MantisService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin")
public class AdminController {

    private final AdminService adminService;
    private final MantisService mantisService;

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
            @RequestBody UserDTO userDTO
    ) {
        return ResponseEntity.ok(adminService.updateUser(id, userDTO));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserDTO> updateUserRole(
            @PathVariable Integer id,
            @RequestParam String role
    ) {
        return ResponseEntity.ok(adminService.updateUserRole(id, role));
    }

    @PostMapping("/users")
    public ResponseEntity<UserDTO> createUser(@RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(adminService.createUser(request));
    }

    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<UserDTO> toggleUserStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(adminService.toggleUserStatus(id));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        adminService.deleteUser(id);
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
            @RequestParam Departement departement
    ) {
        return ResponseEntity.ok(adminService.updateUserDepartement(id, departement));
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
}
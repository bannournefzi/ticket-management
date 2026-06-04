package tn.esprit.ticketmanagement.Admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.service.UserPagePermissionService;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class UserPagePermissionController {

    private final UserPagePermissionService permissionService;

    @GetMapping("/admin/permissions/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> getUserPermissions(@PathVariable Integer userId) {
        return ResponseEntity.ok(permissionService.getGrantedPageKeys(userId));
    }

    @PostMapping("/admin/permissions/{userId}/grant")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> grantAccess(@PathVariable Integer userId,
                                            @RequestBody Map<String, String> body) {
        permissionService.grantAccess(userId, body.get("pageKey"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/admin/permissions/{userId}/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> revokeAccess(@PathVariable Integer userId,
                                             @RequestBody Map<String, String> body) {
        permissionService.revokeAccess(userId, body.get("pageKey"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/user/permissions/my-pages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<String>> getMyPages(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(permissionService.getGrantedPageKeys(currentUser.getId()));
    }
}

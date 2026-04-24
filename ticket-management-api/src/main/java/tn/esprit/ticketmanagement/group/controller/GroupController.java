package tn.esprit.ticketmanagement.group.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.group.dto.GroupMemberRequest;
import tn.esprit.ticketmanagement.group.dto.GroupRequest;
import tn.esprit.ticketmanagement.group.dto.GroupResponse;
import tn.esprit.ticketmanagement.group.service.GroupService;

import java.util.List;

@RestController
@RequestMapping("/groups")
@RequiredArgsConstructor
// REMOVED: @PreAuthorize("hasRole('ADMIN')") from here so users/BAs can fetch their groups
@CrossOrigin(origins = "*")
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')") // Admin only
    public ResponseEntity<GroupResponse> createGroup(
            @RequestBody GroupRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(groupService.createGroup(request, authentication.getName()));
    }

    @GetMapping
    public ResponseEntity<List<GroupResponse>> getAllGroups(Authentication authentication) {
        return ResponseEntity.ok(groupService.getAllGroups(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupResponse> getGroupById(@PathVariable Long id) {
        return ResponseEntity.ok(groupService.getGroupById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')") // Admin only
    public ResponseEntity<GroupResponse> updateGroup(
            @PathVariable Long id,
            @RequestBody GroupRequest request) {
        return ResponseEntity.ok(groupService.updateGroup(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')") // Admin only
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        groupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/members")
    @PreAuthorize("hasRole('ADMIN')") // Admin only
    public ResponseEntity<GroupResponse> addMember(
            @PathVariable Long id,
            @RequestBody GroupMemberRequest request) {
        return ResponseEntity.ok(groupService.addMember(id, request.getUserId()));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasRole('ADMIN')") // Admin only
    public ResponseEntity<GroupResponse> removeMember(
            @PathVariable Long id,
            @PathVariable Long userId) {
        return ResponseEntity.ok(groupService.removeMember(id, userId));
    }

    @GetMapping("/users/available")
    @PreAuthorize("hasRole('ADMIN')") // Admin only
    public ResponseEntity<List<GroupResponse.UserSummary>> getAvailableUsers() {
        return ResponseEntity.ok(groupService.getAvailableUsers());
    }
}
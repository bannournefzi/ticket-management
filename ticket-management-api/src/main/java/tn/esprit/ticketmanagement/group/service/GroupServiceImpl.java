package tn.esprit.ticketmanagement.group.service;

import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.group.dto.GroupRequest;
import tn.esprit.ticketmanagement.group.dto.GroupResponse;
import tn.esprit.ticketmanagement.group.entity.Group;
import tn.esprit.ticketmanagement.group.entity.GroupMembership;
import tn.esprit.ticketmanagement.group.repository.GroupMembershipRepository;
import tn.esprit.ticketmanagement.group.repository.GroupRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j

@Service
@RequiredArgsConstructor
public class GroupServiceImpl implements GroupService {

    private final GroupRepository groupRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final UserRepository userRepository;

    @Override
    public GroupResponse createGroup(GroupRequest request, String createdBy) {
        if (groupRepository.existsByName(request.getName()))
            throw new RuntimeException("Group name already exists: " + request.getName());

        Group group = Group.builder()
                .name(request.getName())
                .description(request.getDescription())
                .createdBy(createdBy)
                .build();

        return toResponse(groupRepository.save(group));
    }

    @Override
    public List<GroupResponse> getAllGroups(String username) {
        // 1. Fetch the currently authenticated user
        User currentUser = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + username));

        // 2. Filter groups so the user only sees ones they created or belong to
        return groupRepository.findAll().stream()
                .filter(group ->
                        username.equals(group.getCreatedBy()) ||
                                group.getMembers().stream()
                                        .anyMatch(member -> member.getId().equals(currentUser.getId()))
                )
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public GroupResponse getGroupById(Long id) {
        return toResponse(findGroup(id));
    }

    @Override
    public GroupResponse updateGroup(Long id, GroupRequest request) {
        Group group = findGroup(id);
        group.setName(request.getName());
        group.setDescription(request.getDescription());
        return toResponse(groupRepository.save(group));
    }

    @Override
    @Transactional
    public void deleteGroup(Long id) {
        Group group = findGroup(id);

        groupMembershipRepository.deleteByGroup(group);
        groupRepository.delete(group);
    }

    @Override
    @Transactional
    public GroupResponse addMember(Long groupId, Long userId) {
        Group group = findGroup(groupId);
        User user = findUser(userId);
        if (!group.getMembers().contains(user))
            group.getMembers().add(user);

        // Create membership record if not exists
        if (!groupMembershipRepository.existsByUserAndGroupAndLeftAtIsNull(user, group)) {
            GroupMembership membership = GroupMembership.builder()
                    .user(user)
                    .group(group)
                    .joinedAt(LocalDateTime.now())
                    .build();
            groupMembershipRepository.save(membership);
            log.info("Created membership record for user {} in group {}", user.getEmail(), group.getName());
        }

        return toResponse(groupRepository.save(group));
    }

    @Override
    @Transactional
    public GroupResponse removeMember(Long groupId, Long userId) {
        Group group = findGroup(groupId);
        User user = findUser(userId);
        group.getMembers().remove(user);

        // Close membership record
        groupMembershipRepository.findByUserAndGroupAndLeftAtIsNull(user, group)
                .ifPresent(m -> {
                    m.setLeftAt(LocalDateTime.now());
                    groupMembershipRepository.save(m);
                    log.info("Closed membership record for user {} in group {}", user.getEmail(), group.getName());
                });

        return toResponse(groupRepository.save(group));
    }

    @Override
    public List<GroupResponse.UserSummary> getAvailableUsers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(
                        User::getId,
                        u -> u,
                        (existing, duplicate) -> existing
                ))
                .values().stream()
                .map(this::toUserSummary)
                .collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Group findGroup(Long id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found with id: " + id));
    }

    private User findUser(Long id) {
        return userRepository.findById(id.intValue())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    private GroupResponse toResponse(Group group) {
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .createdBy(group.getCreatedBy())
                .createdDate(group.getCreatedDate())
                .members(group.getMembers().stream()
                        .map(this::toUserSummary)
                        .collect(Collectors.toList()))
                .build();
    }

    private GroupResponse.UserSummary toUserSummary(User user) {
        return GroupResponse.UserSummary.builder()
                .id(user.getId().longValue())  // ← Integer → Long
                .fullName(user.getFirstName() + " " + user.getLastName())
                .email(user.getEmail())
                .roles(user.getRoles().stream()
                        .map(r -> r.getName())
                        .collect(Collectors.toList()))
                .build();
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initHistoricalMemberships() {
        log.info("Initializing historical group memberships...");
        List<Group> allGroups = groupRepository.findAll();
        int count = 0;
        for (Group group : allGroups) {
            // Initialize the members collection within transaction
            group.getMembers().size();
            for (User member : group.getMembers()) {
                if (groupMembershipRepository.findByUserAndGroupAndLeftAtIsNull(member, group).isEmpty()) {
                    LocalDateTime joinTime = group.getCreatedDate() != null
                            ? group.getCreatedDate()
                            : LocalDateTime.now();
                    GroupMembership membership = GroupMembership.builder()
                            .user(member)
                            .group(group)
                            .joinedAt(joinTime)
                            .build();
                    groupMembershipRepository.save(membership);
                    count++;
                }
            }
        }
        log.info("Created {} historical membership records", count);
    }
}
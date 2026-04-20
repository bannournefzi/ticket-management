package tn.esprit.ticketmanagement.group.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.group.dto.GroupRequest;
import tn.esprit.ticketmanagement.group.dto.GroupResponse;
import tn.esprit.ticketmanagement.group.entity.Group;
import tn.esprit.ticketmanagement.group.repository.GroupRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupServiceImpl implements GroupService {

    private final GroupRepository groupRepository;
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
    public List<GroupResponse> getAllGroups() {
        return groupRepository.findAll().stream()
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
    public void deleteGroup(Long id) {
        groupRepository.delete(findGroup(id));
    }

    @Override
    @Transactional
    public GroupResponse addMember(Long groupId, Long userId) {
        Group group = findGroup(groupId);
        User user = findUser(userId);
        if (!group.getMembers().contains(user))
            group.getMembers().add(user);
        return toResponse(groupRepository.save(group));
    }

    @Override
    @Transactional
    public GroupResponse removeMember(Long groupId, Long userId) {
        Group group = findGroup(groupId);
        User user = findUser(userId);
        group.getMembers().remove(user);
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
}
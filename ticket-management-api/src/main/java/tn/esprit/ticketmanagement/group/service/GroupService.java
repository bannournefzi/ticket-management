package tn.esprit.ticketmanagement.group.service;

import tn.esprit.ticketmanagement.group.dto.*;

import java.util.List;

public interface GroupService {
    GroupResponse createGroup(GroupRequest request, String createdBy);
    List<GroupResponse> getAllGroups();
    GroupResponse getGroupById(Long id);
    GroupResponse updateGroup(Long id, GroupRequest request);
    void deleteGroup(Long id);
    GroupResponse addMember(Long groupId, Long userId);
    GroupResponse removeMember(Long groupId, Long userId);
    List<GroupResponse.UserSummary> getAvailableUsers();
}

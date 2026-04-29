package tn.esprit.ticketmanagement.group.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.group.entity.Group;
import tn.esprit.ticketmanagement.group.entity.GroupMembership;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMembershipRepository extends JpaRepository<GroupMembership, Long> {

    Optional<GroupMembership> findByUserAndGroupAndLeftAtIsNull(User user, Group group);

    List<GroupMembership> findByUserAndLeftAtIsNull(User user);

    List<GroupMembership> findByUser(User user);

    @Query("SELECT gm FROM GroupMembership gm WHERE gm.user = :user AND gm.group = :group " +
           "AND gm.joinedAt <= :atTime AND (gm.leftAt IS NULL OR gm.leftAt > :atTime)")
    List<GroupMembership> findMembershipAtTime(
            @Param("user") User user,
            @Param("group") Group group,
            @Param("atTime") LocalDateTime atTime);

    @Query("SELECT CASE WHEN COUNT(gm) > 0 THEN true ELSE false END FROM GroupMembership gm " +
           "WHERE gm.user.id = :userId AND gm.group.id = :groupId " +
           "AND gm.joinedAt <= :atTime AND (gm.leftAt IS NULL OR gm.leftAt >= :atTime)")
    boolean wasMemberAt(
            @Param("userId") Integer userId,
            @Param("groupId") Long groupId,
            @Param("atTime") LocalDateTime atTime);

    @Query("SELECT gm.group FROM GroupMembership gm WHERE gm.user = :user AND gm.leftAt IS NULL")
    List<Group> findActiveGroupsByUser(@Param("user") User user);

    @Query("SELECT DISTINCT gm.group FROM GroupMembership gm WHERE gm.user = :user")
    List<Group> findAllGroupsByUser(@Param("user") User user);

    boolean existsByUserAndGroupAndLeftAtIsNull(User user, Group group);

    void deleteByGroup(Group group);

}
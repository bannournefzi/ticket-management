package tn.esprit.ticketmanagement.User.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.ticketmanagement.User.entity.UserPagePermission;

import java.util.List;
import java.util.Optional;

public interface UserPagePermissionRepository extends JpaRepository<UserPagePermission, Long> {

    List<UserPagePermission> findByUserId(Integer userId);

    Optional<UserPagePermission> findByUserIdAndPageKey(Integer userId, String pageKey);

    void deleteByUserId(Integer userId);
}

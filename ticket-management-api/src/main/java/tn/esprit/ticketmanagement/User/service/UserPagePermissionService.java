package tn.esprit.ticketmanagement.User.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.entity.UserPagePermission;
import tn.esprit.ticketmanagement.User.repository.UserPagePermissionRepository;
import tn.esprit.ticketmanagement.User.repository.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserPagePermissionService {

    public static final List<String> ALL_PAGE_KEYS = List.of(
            "DASHBOARD", "CREER_TICKET", "MES_TICKETS", "ASSISTANT_DEPANNAGE",
            "BASE_CONNAISSANCES", "CALENDRIER_SLA", "MESSAGES",
            "CALENDRIER_REUNIONS", "REUNIONS", "MON_PROFIL"
    );

    private static final List<String> DEFAULT_PAGE_KEYS = List.of(
            "DASHBOARD", "CREER_TICKET", "MES_TICKETS",
            "CALENDRIER_SLA", "MESSAGES",
            "CALENDRIER_REUNIONS", "REUNIONS", "MON_PROFIL"
    );

    private final UserPagePermissionRepository permissionRepository;
    private final UserRepository userRepository;

    public void grantAccess(Integer userId, String pageKey) {
        Optional<UserPagePermission> existing = permissionRepository.findByUserIdAndPageKey(userId, pageKey);
        if (existing.isPresent()) {
            UserPagePermission perm = existing.get();
            if (!perm.isGranted()) {
                perm.setGranted(true);
                permissionRepository.save(perm);
                log.debug("Granted access: user={} pageKey={}", userId, pageKey);
            }
        } else {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));
            UserPagePermission perm = UserPagePermission.builder()
                    .user(user)
                    .pageKey(pageKey)
                    .granted(true)
                    .build();
            permissionRepository.save(perm);
            log.debug("Created permission: user={} pageKey={}", userId, pageKey);
        }
    }

    public void revokeAccess(Integer userId, String pageKey) {
        UserPagePermission perm = permissionRepository.findByUserIdAndPageKey(userId, pageKey)
                .orElseThrow(() -> new RuntimeException("Permission not found: user=" + userId + " pageKey=" + pageKey));
        perm.setGranted(false);
        permissionRepository.save(perm);
        log.debug("Revoked access: user={} pageKey={}", userId, pageKey);
    }

    public List<String> getGrantedPageKeys(Integer userId) {
        return permissionRepository.findByUserId(userId)
                .stream()
                .filter(UserPagePermission::isGranted)
                .map(UserPagePermission::getPageKey)
                .collect(Collectors.toList());
    }

    public boolean hasAccess(Integer userId, String pageKey) {
        return permissionRepository.findByUserIdAndPageKey(userId, pageKey)
                .map(UserPagePermission::isGranted)
                .orElse(false);
    }

    public void grantAllDefaultPages(Integer userId) {
        DEFAULT_PAGE_KEYS.forEach(pageKey -> grantAccess(userId, pageKey));
        log.info("Granted all default pages to user={}", userId);
    }

    public void deleteByUserId(Integer userId) {
        permissionRepository.deleteByUserId(userId);
        log.debug("Deleted all page permissions for user={}", userId);
    }
}

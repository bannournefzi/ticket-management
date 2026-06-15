package tn.esprit.ticketmanagement.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.entity.UserPagePermission;
import tn.esprit.ticketmanagement.User.repository.UserPagePermissionRepository;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.User.service.UserPagePermissionService;

import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class UserPagePermissionServiceTest {

    @Mock UserPagePermissionRepository permissionRepository;
    @Mock UserRepository userRepository;

    @InjectMocks
    UserPagePermissionService service;

    @Test
    void grantAccess_shouldCreatePermissionWhenNotExists() {
        User user = new User();
        user.setId(1);

        when(permissionRepository.findByUserIdAndPageKey(1, "DASHBOARD")).thenReturn(Optional.empty());
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        service.grantAccess(1, "DASHBOARD");

        verify(permissionRepository).save(any(UserPagePermission.class));
    }

    @Test
    void revokeAccess_shouldSetGrantedFalse() {
        UserPagePermission perm = new UserPagePermission();
        perm.setGranted(true);

        when(permissionRepository.findByUserIdAndPageKey(1, "DASHBOARD")).thenReturn(Optional.of(perm));

        service.revokeAccess(1, "DASHBOARD");

        assertThat(perm.isGranted()).isFalse();
        verify(permissionRepository).save(perm);
    }

    @Test
    void getGrantedPageKeys_shouldReturnOnlyGranted() {
        UserPagePermission p1 = new UserPagePermission();
        p1.setPageKey("DASHBOARD"); p1.setGranted(true);

        UserPagePermission p2 = new UserPagePermission();
        p2.setPageKey("MESSAGES"); p2.setGranted(false);

        when(permissionRepository.findByUserId(1)).thenReturn(List.of(p1, p2));

        List<String> result = service.getGrantedPageKeys(1);

        assertThat(result).containsExactly("DASHBOARD");
    }

    @Test
    void grantAllDefaultPages_shouldGrant8Pages() {
        when(permissionRepository.findByUserIdAndPageKey(any(), any())).thenReturn(Optional.empty());
        when(userRepository.findById(any())).thenReturn(Optional.of(new User()));

        service.grantAllDefaultPages(1);

        // 8 default pages
        verify(permissionRepository, times(8)).save(any());
    }
}

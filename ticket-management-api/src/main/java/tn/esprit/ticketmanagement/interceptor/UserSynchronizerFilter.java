package tn.esprit.ticketmanagement.interceptor;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tn.esprit.ticketmanagement.User.UserSynchronizer;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserSynchronizerFilter extends OncePerRequestFilter {

    private final UserSynchronizer userSynchronizer;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication != null && authentication.isAuthenticated() && !isAnonymous(authentication)) {
                Object principal = authentication.getPrincipal();

                if (principal instanceof UserDetails) {
                    UserDetails userDetails = (UserDetails) principal;
                    String userEmail = userDetails.getUsername(); // Email is stored in username field

                    log.debug("Synchronizing user activity for: {}", userEmail);

                    userSynchronizer.updateLastSeenTimestamp(userEmail);
                }
            }
        } catch (Exception e) {
            log.error("Error in UserSynchronizerFilter: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        return path.startsWith("/auth") ||
                path.startsWith("/api/v1/auth") ||
                path.startsWith("/swagger") ||
                path.startsWith("/v3/api-docs") ||
                path.startsWith("/ws");
    }


    private boolean isAnonymous(Authentication authentication) {
        return authentication.getPrincipal().equals("anonymousUser");
    }
}
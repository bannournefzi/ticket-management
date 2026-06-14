package tn.esprit.ticketmanagement.auth.service;

import jakarta.mail.MessagingException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Notification.NotificationType;
import tn.esprit.ticketmanagement.Notification.PlatformNotificationService;
import tn.esprit.ticketmanagement.User.entity.Token;
import tn.esprit.ticketmanagement.User.repository.TokenRepository;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.auth.dto.AuthenticationRequest;
import tn.esprit.ticketmanagement.auth.dto.AuthenticationResponse;
import tn.esprit.ticketmanagement.auth.email.EmailTemplateName;
import tn.esprit.ticketmanagement.auth.entity.RegistrationRequest;
import tn.esprit.ticketmanagement.Audit.entity.AuditLog;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.User.service.UserPagePermissionService;
import tn.esprit.ticketmanagement.role.Role;
import tn.esprit.ticketmanagement.role.RoleRepository;
import tn.esprit.ticketmanagement.security.jwtService;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final TokenRepository tokenRepository;
    private final Emailservice emailservice;
    private final AuthenticationManager authenticationManager;
    private final jakarta.servlet.http.HttpServletRequest httpServletRequest;
    private final tn.esprit.ticketmanagement.User.repository.UserSessionRepository userSessionRepository;

    private final jwtService jwtservice;
    private final PlatformNotificationService platformNotificationService;
    private final UserPagePermissionService userPagePermissionService;
    private final AuditLogService auditLogService;

    @Value("${application.mailing.frontend.activation-url}")
    private String activationUrl;

    public void register(RegistrationRequest request) throws MessagingException {

        // Default to ROLE_USER if no role provided
        String roleName = request.getRole() != null ? request.getRole() : "ROLE_USER";

        var userRole = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException(roleName + " not found"));

        var user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .accountLocked(false)
                .enabled(false)
                .roles(List.of(userRole))
                .build();

        userRepository.save(user);
        userPagePermissionService.grantAllDefaultPages(user.getId());
        sendValidationEmail(user);

        auditLogService.log(user.getId(), user.fullName(), AuditLog.ACTION_REGISTER, "Auth",
                "User", user.getId().longValue(),
                "Inscription de " + user.getEmail());

        // Notify all admins about new user registration
        platformNotificationService.createAndPushToRole("ROLE_ADMIN",
                NotificationType.USER_CREATED,
                "Nouvel utilisateur",
                user.fullName() + " s'est inscrit (" + user.getEmail() + ")",
                user.getId().toString());
    }

    private void sendValidationEmail(User user) throws MessagingException {
        var newToken = generateAndSaveActivationToken(user);

        emailservice.sendEmail(
                user.getEmail(),
                user.fullName(),
                EmailTemplateName.ACTIVATE_ACCOUNT,
                activationUrl,
                newToken,
                "Activate_Acount"
        );
    }

    private String generateAndSaveActivationToken(User user) {

        String generatedToken = generateActivationCode(6);

        var token = Token.builder()
                .token(generatedToken)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .user(user)
                .build();

        tokenRepository.save(token);
        return generatedToken;
    }

    private String generateActivationCode(int length) {
        String characters = "0123456789";
        StringBuilder codeBuilder = new StringBuilder();
        SecureRandom secureRandom = new SecureRandom();
        for (int i = 0; i < length; i++) {
            int randomIndex = secureRandom.nextInt(characters.length());
            codeBuilder.append(characters.charAt(randomIndex));
        }
        return codeBuilder.toString();
    }

    public AuthenticationResponse authenticate(@Valid AuthenticationRequest request) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        var claims = new HashMap<String, Object>();
        var user = (User) auth.getPrincipal();
        claims.put("fullName", user.fullName());
        claims.put("userId", user.getId());

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());
        claims.put("roles", roles);

        // 1. Generate the unique JWT ID FIRST
        String jwtId = java.util.UUID.randomUUID().toString();

        // 2. Generate the token WITH the new JTI
        var jwtToken = jwtservice.generateToken(claims, user, jwtId);

        // 3. Get IP and User-Agent
        String ipAddress = httpServletRequest.getRemoteAddr();
        String userAgent = httpServletRequest.getHeader("User-Agent");
        String browser = "Inconnu";
        String os = "Inconnu";

        if (userAgent != null) {
            // Very simple User-Agent parsing
            if (userAgent.toLowerCase().contains("chrome")) browser = "Google Chrome";
            else if (userAgent.toLowerCase().contains("firefox")) browser = "Firefox";
            else if (userAgent.toLowerCase().contains("safari")) browser = "Safari";
            else if (userAgent.toLowerCase().contains("edge")) browser = "Microsoft Edge";
            else if (userAgent.toLowerCase().contains("postman")) browser = "Postman";

            if (userAgent.toLowerCase().contains("windows")) os = "Windows";
            else if (userAgent.toLowerCase().contains("mac")) os = "MacOS";
            else if (userAgent.toLowerCase().contains("linux")) os = "Linux";
            else if (userAgent.toLowerCase().contains("android")) os = "Android";
            else if (userAgent.toLowerCase().contains("iphone") || userAgent.toLowerCase().contains("ipad")) os = "iOS";
        }

        // 4. Save the active session using the CLEANED parsed values
        tn.esprit.ticketmanagement.User.entity.UserSession session = tn.esprit.ticketmanagement.User.entity.UserSession.builder()
                .user(user)
                .jwtId(jwtId)
                .ipAddress(ipAddress)
                .browser(browser) // <--- Fixed here to use the parsed variable
                .deviceOs(os)     // <--- Fixed here to use the parsed variable
                .loginAt(LocalDateTime.now())
                .lastActivityAt(LocalDateTime.now())
                .isValid(true)
                .build();

        userSessionRepository.save(session);

        auditLogService.log(user.getId(), user.fullName(), AuditLog.ACTION_LOGIN, "Auth",
                "User", user.getId().longValue(),
                "Connexion de " + user.getEmail() + " depuis " + ipAddress,
                ipAddress, userAgent);

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .build();
    }

    public void activateAccount(String token) throws MessagingException {
        Token savedToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Token not found"));

        if (LocalDateTime.now().isAfter(savedToken.getExpiresAt())) {

            savedToken.setExpiresAt(LocalDateTime.now().minusMinutes(1));
            tokenRepository.save(savedToken);

            sendValidationEmail(savedToken.getUser());

            throw new RuntimeException("Token expired. A new one was sent to your email.");
        }

        var user = userRepository.findById(savedToken.getUser().getId())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        user.setEnabled(true);
        userRepository.save(user);

        savedToken.setValidatedAt(LocalDateTime.now());
        tokenRepository.save(savedToken);

        auditLogService.log(user.getId(), user.fullName(), AuditLog.ACTION_ACTIVATE_ACCOUNT, "Auth",
                "User", user.getId().longValue(),
                "Activation du compte " + user.getEmail());
    }
}
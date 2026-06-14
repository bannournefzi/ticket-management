package tn.esprit.ticketmanagement.Audit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_created_date", columnList = "createdDate"),
        @Index(name = "idx_audit_user_id", columnList = "userId"),
        @Index(name = "idx_audit_action_type", columnList = "actionType")
})
@EntityListeners(AuditingEntityListener.class)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer userId;

    @Column(length = 100)
    private String userFullName;

    @Column(nullable = false, length = 50)
    private String actionType;

    @Column(length = 50)
    private String module;

    @Column(length = 50)
    private String entityType;

    private Long entityId;

    @Column(length = 500)
    private String details;

    @Column(length = 45)
    private String ipAddress;

    @Column(length = 300)
    private String userAgent;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdDate;

    public static final String ACTION_LOGIN = "LOGIN";
    public static final String ACTION_LOGOUT = "LOGOUT";
    public static final String ACTION_REGISTER = "REGISTER";
    public static final String ACTION_ACTIVATE_ACCOUNT = "ACTIVATE_ACCOUNT";
    public static final String ACTION_CREATE_TICKET = "CREATE_TICKET";
    public static final String ACTION_UPDATE_TICKET = "UPDATE_TICKET";
    public static final String ACTION_CHANGE_TICKET_STATUS = "CHANGE_TICKET_STATUS";
    public static final String ACTION_DELETE_TICKET = "DELETE_TICKET";
    public static final String ACTION_ASSIGN_TICKET = "ASSIGN_TICKET";
    public static final String ACTION_PUSH_TO_MANTIS = "PUSH_TO_MANTIS";
    public static final String ACTION_CREATE_COMMENT = "CREATE_COMMENT";
    public static final String ACTION_DELETE_COMMENT = "DELETE_COMMENT";
    public static final String ACTION_PUSH_ATTACHMENT_TO_MANTIS = "PUSH_ATTACHMENT_TO_MANTIS";
    public static final String ACTION_UPLOAD_ATTACHMENT = "UPLOAD_ATTACHMENT";
    public static final String ACTION_TOGGLE_COMMENTS = "TOGGLE_COMMENTS";
    public static final String ACTION_CREATE_USER = "CREATE_USER";
    public static final String ACTION_UPDATE_USER = "UPDATE_USER";
    public static final String ACTION_DELETE_USER = "DELETE_USER";
    public static final String ACTION_TOGGLE_USER_STATUS = "TOGGLE_USER_STATUS";
    public static final String ACTION_UPDATE_USER_ROLE = "UPDATE_USER_ROLE";
    public static final String ACTION_CHANGE_PASSWORD = "CHANGE_PASSWORD";
    public static final String ACTION_FORGOT_PASSWORD = "FORGOT_PASSWORD";
    public static final String ACTION_RESET_PASSWORD = "RESET_PASSWORD";
    public static final String ACTION_UPDATE_PROFILE_PHOTO = "UPDATE_PROFILE_PHOTO";
    public static final String ACTION_DELETE_PROFILE_PHOTO = "DELETE_PROFILE_PHOTO";
}

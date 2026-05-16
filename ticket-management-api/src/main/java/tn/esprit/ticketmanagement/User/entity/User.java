package tn.esprit.ticketmanagement.User.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import tn.esprit.ticketmanagement.User.enums.Departement;
import tn.esprit.ticketmanagement.chat.entity.Conversation;
import tn.esprit.ticketmanagement.common.UserConstants;
import tn.esprit.ticketmanagement.role.Role;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;


@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@NamedQuery(name = UserConstants.FIND_USER_BY_EMAIL,
        query = "SELECT u FROM User u WHERE u.email = :email"
)
@NamedQuery(name = UserConstants.FIND_ALL_USERS_EXCEPT_SELF,
        query = "SELECT u FROM User u WHERE u.id != :publicId")
@NamedQuery(name = UserConstants.FIND_USER_BY_PUBLIC_ID,
        query = "SELECT u FROM User u WHERE u.id = :publicId")
public class User implements UserDetails, Principal {


    private static final int LAST_ACTIVATE_INTERVAL = 5; // in minutes

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    public String username;
    private String password;

    private String firstName;
    private String lastName;

    @Column(unique = true, nullable = false)
    private String email;

    private String phone;
    private String address;

    private LocalDate dateOfBirth;

    private Boolean accountLocked;
    private Boolean enabled;

    /**
     * Photo de profil stockée en base (BLOB)
     */

    @Column(name = "profile_photo", columnDefinition = "bytea")
    private byte[] profilePhoto;

    @Column(name = "mantis_project")
    private String mantisProject;

    @Column(name = "profile_photo_type")
    private String profilePhotoType;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @ManyToMany(fetch = FetchType.EAGER)
    private List<Role> roles;

    @OneToMany(mappedBy = "sender", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Conversation> chatsAsSender;

    @OneToMany(mappedBy = "recipient", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Conversation> chatsAsRecipient;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    @Column(insertable = false)
    private LocalDateTime lastModifiedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "departement")
    private Departement departement;

    /* =========================
       Business Logic Methods
       ========================= */

    public boolean hasRole(String roleName) {
        return this.roles != null && this.roles.stream()
                .anyMatch(role -> role.getName().equals(roleName));
    }

    public boolean isAdmin() {
        return hasRole("ROLE_ADMIN");
    }

    public boolean isBusinessAnalyst() {
        return hasRole("ROLE_BUSINESS_ANALYST");
    }

    public boolean isIT() {
        return hasRole("ROLE_BUSINESS_ANALYST");
    }

    public boolean isUser() {
        return hasRole("ROLE_USER");
    }

    public boolean isOperationnel() {
        return hasRole("ROLE_OPERATIONNEL");
    }

    @Transient
    public boolean isUserOnline() {
        return lastSeen != null && lastSeen.isAfter(LocalDateTime.now().minusMinutes(LAST_ACTIVATE_INTERVAL));
    }

    public String fullName() {
        return firstName + " " + lastName;
    }

    /* =========================
       Security implementations
       ========================= */




    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return this.roles.stream()
                .map(r -> new SimpleGrantedAuthority(r.getName()))
                .collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !accountLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public String getName() {
        return email;
    }

    public String getDepartment() {
        return departement != null ? departement.name() : null;
    }

}
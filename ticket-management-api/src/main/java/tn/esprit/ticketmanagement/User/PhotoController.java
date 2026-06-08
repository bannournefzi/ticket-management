package tn.esprit.ticketmanagement.User;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import tn.esprit.ticketmanagement.Audit.entity.AuditLog;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;

import java.io.IOException;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "User Photo")
public class PhotoController {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @PostMapping("/{id}/photo")
    @PreAuthorize("hasRole('ROLE_ADMIN') or #id.longValue() == authentication.principal.id")
    public ResponseEntity<String> uploadPhoto(
            @PathVariable Integer id,
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Fichier vide");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("La taille maximale est de 5 Mo");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body("Seules les images sont acceptées");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        user.setProfilePhoto(file.getBytes());
        user.setProfilePhotoType(contentType);
        userRepository.save(user);

        auditLogService.log(id, user.fullName(), AuditLog.ACTION_UPDATE_PROFILE_PHOTO,
                "User", "User", id.longValue(),
                "Photo de profil uploadée pour l'utilisateur #" + id);
        return ResponseEntity.ok("Photo uploadée avec succès");
    }

    @GetMapping("/{id}/photo")
    @PreAuthorize("hasRole('ROLE_ADMIN') or #id.longValue() == authentication.principal.id")
    public ResponseEntity<byte[]> getPhoto(@PathVariable Integer id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (user.getProfilePhoto() == null) {
            return ResponseEntity.noContent().build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                user.getProfilePhotoType() != null ? user.getProfilePhotoType() : "image/jpeg"
        ));
        headers.setCacheControl("max-age=86400");

        return new ResponseEntity<>(user.getProfilePhoto(), headers, HttpStatus.OK);
    }

    @DeleteMapping("/{id}/photo")
    @PreAuthorize("hasRole('ROLE_ADMIN') or #id.longValue() == authentication.principal.id")
    public ResponseEntity<Void> deletePhoto(@PathVariable Integer id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        user.setProfilePhoto(null);
        user.setProfilePhotoType(null);
        userRepository.save(user);

        auditLogService.log(id, user.fullName(), AuditLog.ACTION_DELETE_PROFILE_PHOTO,
                "User", "User", id.longValue(),
                "Photo de profil supprimée pour l'utilisateur #" + id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/photo/exists")
    public ResponseEntity<Boolean> hasPhoto(@PathVariable Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return ResponseEntity.ok(user.getProfilePhoto() != null);
    }
}
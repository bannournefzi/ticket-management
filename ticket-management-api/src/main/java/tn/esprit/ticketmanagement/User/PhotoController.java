package tn.esprit.ticketmanagement.User;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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

    /**
     * Upload profile photo
     */
    @PostMapping("/{id}/photo")
    public ResponseEntity<String> uploadPhoto(
            @PathVariable Integer id,
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Fichier vide");
        }

        // Vérifier la taille (max 5 Mo)
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("La taille maximale est de 5 Mo");
        }

        // Vérifier le type
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

    /**
     * Get profile photo
     */
    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> getPhoto(@PathVariable Integer id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (user.getProfilePhoto() == null) {
            return ResponseEntity.notFound().build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                user.getProfilePhotoType() != null ? user.getProfilePhotoType() : "image/jpeg"
        ));
        headers.setCacheControl("max-age=86400"); // Cache 1 jour

        return new ResponseEntity<>(user.getProfilePhoto(), headers, HttpStatus.OK);
    }

    /**
     * Delete profile photo
     */
    @DeleteMapping("/{id}/photo")
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

    /**
     * Check if user has a photo
     */
    @GetMapping("/{id}/photo/exists")
    public ResponseEntity<Boolean> hasPhoto(@PathVariable Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        return ResponseEntity.ok(user.getProfilePhoto() != null);
    }
}
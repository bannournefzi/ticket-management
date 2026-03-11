package tn.esprit.ticketmanagement.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    @Value("${application.file.uploads.media-output-path}")
    private String uploadPath;

    @Value("${application.file.uploads.max-file-size}")
    private long maxFileSize;

    @Value("${application.file.uploads.allowed-extensions}")
    private String allowedExtensions;

    /**
     * Save file and return the file path
     */
    public String saveFile(MultipartFile file, String userId) {
        try {
            // Validate file
            validateFile(file);

            // Create upload directory if it doesn't exist
            Path uploadDir = Paths.get(uploadPath, userId);
            Files.createDirectories(uploadDir);

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalFilename);
            String uniqueFilename = UUID.randomUUID() + "." + fileExtension;

            // Save file
            Path filePath = uploadDir.resolve(uniqueFilename);
            Files.write(filePath, file.getBytes());

            log.info("File saved successfully: {}", filePath);
            return filePath.toString();

        } catch (IOException e) {
            log.error("Error saving file: {}", e.getMessage());
            throw new RuntimeException("Failed to save file: " + e.getMessage());
        }
    }

    /**
     * Validate uploaded file
     */
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of " + maxFileSize + " bytes");
        }

        String fileExtension = getFileExtension(file.getOriginalFilename());
        if (!isAllowedExtension(fileExtension)) {
            throw new IllegalArgumentException("File type ." + fileExtension + " is not allowed");
        }
    }

    /**
     * Get file extension
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : "";
    }

    /**
     * Check if file extension is allowed
     */
    private boolean isAllowedExtension(String extension) {
        if (allowedExtensions == null || allowedExtensions.isEmpty()) {
            return true;
        }
        String[] allowed = allowedExtensions.split(",");
        for (String ext : allowed) {
            if (ext.trim().equalsIgnoreCase(extension)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Read file from location
     */
    public byte[] readFileFromLocation(String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (Files.exists(path)) {
                return Files.readAllBytes(path);
            } else {
                log.warn("File not found: {}", filePath);
                return new byte[0];
            }
        } catch (IOException e) {
            log.error("Error reading file: {}", e.getMessage());
            throw new RuntimeException("Failed to read file: " + e.getMessage());
        }
    }

    /**
     * Delete file
     */
    public boolean deleteFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (Files.exists(path)) {
                Files.delete(path);
                log.info("File deleted successfully: {}", filePath);
                return true;
            }
            return false;
        } catch (IOException e) {
            log.error("Error deleting file: {}", e.getMessage());
            return false;
        }
    }
}
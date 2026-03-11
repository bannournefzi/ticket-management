package tn.esprit.ticketmanagement.common;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tn.esprit.ticketmanagement.chat.service.FileService;

@Component
@RequiredArgsConstructor
public class FileUtils {

    private final FileService fileService;

    /**
     * Read file from location as bytes
     */
    public static byte[] readFileFromLocation(String filePath) {
        FileService fileService = new FileService(); // This is a workaround
        return fileService.readFileFromLocation(filePath);
    }
}
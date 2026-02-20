package com.example.musicapp_backend.controller;

import com.example.musicapp_backend.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {

    private final StorageService storageService;

    public MediaController(StorageService storageService) {
        this.storageService = storageService;
    }

    // ----------------- DTO-uri -------------

    // this is what the client sends to us
    public record UploadRequest(String filename, String contentType, String prefix) {
    }

    // this is what we send back
    public record UploadResponse(String s3Key, String uploadUrl) {
    }

    // ----------------- ENDPOINTS -------------

    @PostMapping("/upload-url")
    public ResponseEntity<UploadResponse> createUploadUrl(@RequestBody UploadRequest req) {
        // 1. Set default path to "music" if not provided
        String folder = (req.prefix() != null && !req.prefix().isBlank())
                ? req.prefix()
                : "music";

        // 2. Generate the unique S3 key (filename)
        // StorageService handles unique key and sanitation
        String key = storageService.generateObjectKey(folder, req.filename());

        // 3. Generate the presigned URL
        String url = storageService.createPresignedUploadUrl(
                key,
                req.contentType(),
                Duration.ofMinutes(10)); // Expires in 10 min

        // 4. Return structured response
        return ResponseEntity.ok(new UploadResponse(key, url));
    }

    // Kept this for generic file downloads (album covers),
    // even though Songs use the specific /play endpoint.
    @GetMapping("/download-url")
    public ResponseEntity<Map<String, String>> createDownloadUrl(@RequestParam String key) {
        String url = storageService.createPresignedDownloadUrl(key, Duration.ofMinutes(10));
        return ResponseEntity.ok(Map.of(
                "key", key,
                "url", url.toString()));
    }
}
package com.example.musicapp_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.Duration;
import java.util.UUID;

//AWS storage service class

@Service
@ConditionalOnProperty(name = { "aws.s3.region", "aws.s3.bucket" })
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final String bucket;
    private final S3Client s3Client;
    private final S3Presigner presigner;

    public StorageService(@Value("${aws.s3.bucket}") String bucket,
            S3Client s3Client,
            S3Presigner presigner) {
        this.bucket = bucket;
        this.s3Client = s3Client;
        this.presigner = presigner;
    }

    public String generateObjectKey(String prefix, String originalFilename) {
        String safePrefix = (prefix == null || prefix.isBlank()) ? "media" : prefix;

        String ext = (originalFilename != null && originalFilename.contains("."))
                ? originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase()
                : "";

        String safeName = sanitizeFilename(originalFilename);
        String random = UUID.randomUUID().toString().substring(0, 8);

        return safePrefix + "/" + safeName + "-" + random + ext;
    }

    public String createPresignedUploadUrl(String key, String contentType, Duration expiresIn) {
        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(expiresIn != null ? expiresIn : Duration.ofMinutes(15))
                .putObjectRequest(put)
                .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
        return presigned.url().toString();
    }

    public String createPresignedDownloadUrl(String key, Duration expiresIn) {
        GetObjectRequest get = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiresIn != null ? expiresIn : Duration.ofMinutes(15))
                .getObjectRequest(get)
                .build();

        PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
        return presigned.url().toString();
    }

    public void deleteObject(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build());
    }

    /**
     * Safely delete an S3 object. If key is null/blank, does nothing.
     * Catches and logs exceptions so a failed S3 delete does not break the caller.
     */
    public void safeDelete(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            deleteObject(key);
            log.info("Deleted S3 object: {}", key);
        } catch (Exception e) {
            log.warn("Failed to delete S3 object '{}': {}", key, e.getMessage());
        }
    }

    public boolean exists(String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            throw new RuntimeException("Failed to check S3 object existence: " + e.getMessage(), e);
        }
    }

    /**
     * Wait for an S3 object to appear (handles S3 eventual consistency).
     * Retries up to maxRetries times with delayMs between each attempt.
     *
     * @return true if found within retries, false otherwise
     * @throws RuntimeException if S3 connectivity fails on the last retry
     */
    public boolean waitForObject(String key, int maxRetries, int delayMs) {
        for (int i = 0; i < maxRetries; i++) {
            try {
                if (exists(key)) {
                    return true;
                }
            } catch (RuntimeException e) {
                if (i == maxRetries - 1) {
                    throw e;
                }
                log.warn("S3 existence check failed (attempt {}/{}): {}", i + 1, maxRetries, e.getMessage());
            }
            if (i < maxRetries - 1) {
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted while waiting for S3 object", ie);
                }
            }
        }
        return false;
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file";
        }

        int max_basename_length = 50;

        String name = filename.replace("\\", "/");
        name = name.substring(name.lastIndexOf('/') + 1);

        int dotIndex = name.lastIndexOf('.');
        if (dotIndex > 0) {
            name = name.substring(0, dotIndex);
        }

        name = name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");

        if (name.isBlank()) {
            name = "file";
        }

        // HARD LIMIT
        if (name.length() > max_basename_length) {
            name = name.substring(0, max_basename_length);
        }

        return name;
    }

}

package com.example.musicapp_backend.controller;

import com.example.musicapp_backend.dto.AlbumCreateRequest;
import com.example.musicapp_backend.dto.AlbumDto;
import com.example.musicapp_backend.service.AlbumService;
import com.example.musicapp_backend.service.StorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/albums")
public class AlbumController {

    private final AlbumService service;
    private final StorageService storageService;

    public AlbumController(AlbumService service, StorageService storageService) {
        this.service = service;
        this.storageService = storageService;
    }

    /** Get all albums */
    @GetMapping
    public ResponseEntity<List<AlbumDto>> all() {
        return ResponseEntity.ok(service.all());
    }

    /** Get one album by ID */
    @GetMapping("/{id}")
    public ResponseEntity<AlbumDto> one(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    // ------------ COVER ART -----

    public record CoverResponse(String coverUrl) {
    }

    /** get a presigned download URL for the album's cover art */
    @GetMapping("/{id}/cover")
    public ResponseEntity<CoverResponse> cover(@PathVariable Long id) {
        String s3Key = service.getCoverArtS3Key(id);

        if (s3Key == null || s3Key.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Album does not have cover art.");
        }

        String presignedUrl = storageService.createPresignedDownloadUrl(
                s3Key,
                java.time.Duration.ofMinutes(10));

        return ResponseEntity.ok(new CoverResponse(presignedUrl));
    }

    // ------------- WRITE ---------

    /**
     * * finalize album creation
     * use this after uploading the cover art to S3 using MediaController
     */
    @PostMapping("/finalize")
    public ResponseEntity<AlbumDto> finalizeUpload(@RequestBody AlbumCreateRequest req) {
        validate(req);

        // Verify cover art exists in S3 retrying
        if (req.coverArtS3Key() != null && !req.coverArtS3Key().isBlank()) {
            boolean exists;
            try {
                exists = storageService.waitForObject(req.coverArtS3Key(), 6, 500);
            } catch (RuntimeException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Failed to verify S3 object: " + e.getMessage());
            }
            if (!exists) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "S3 object not found for cover art: " + req.coverArtS3Key());
            }
        }

        AlbumDto dto = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/albums/" + dto.id())).body(dto);
    }

    /** update an album */
    @PutMapping("/{id}")
    public ResponseEntity<AlbumDto> update(@PathVariable Long id, @RequestBody AlbumCreateRequest req) {
        validate(req);
        return ResponseEntity.ok(service.update(id, req));
    }

    /** delete an album */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    private void validate(AlbumCreateRequest req) {
        if (req == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Body required.");
        if (req.title() == null || req.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title required.");
        }
    }
}

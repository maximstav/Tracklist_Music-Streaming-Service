package com.example.musicapp_backend.controller;

import com.example.musicapp_backend.dto.PlaylistCreateRequest;
import com.example.musicapp_backend.dto.PlaylistDto;
import com.example.musicapp_backend.service.PlaylistService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/playlists")
public class PlaylistController {

    private final PlaylistService service;

    public PlaylistController(PlaylistService service) {
        this.service = service;
    }

    // -------------------- READ --------------------

    /** get one playlist by ID */
    @GetMapping("/{id}")
    public ResponseEntity<PlaylistDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    /**
     * Get the current user's library.
     * the frontend calls GET /api/v1/playlists/my
     * no ID required in the URL.
     */
    @GetMapping("/my")
    public ResponseEntity<List<PlaylistDto>> getMyPlaylists(java.security.Principal principal) {
        // 1. The Principal contains the username from the JWT token
        String username = principal.getName();

        // 2. Pass this username to the service to find the playlists
        return ResponseEntity.ok(service.findAllByUsername(username));
    }

    /** Get all playlists for a specific user.
     * NOT ideal because a user should only see his own playlists.
     * see function getMyPlaylists in this class
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PlaylistDto>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(service.findAllByUserId(userId));
    }

    // ------------------ WRITE ------------

    @PostMapping
    public ResponseEntity<PlaylistDto> create(@RequestBody PlaylistCreateRequest req, java.security.Principal principal) {
        if (req == null || req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Playlist name is required.");
        }
        // get user email from JWT token (Principal)
        String email = principal.getName();

        PlaylistDto dto = service.createForUser(req, email);
        return ResponseEntity.created(URI.create("/api/v1/playlists/" + dto.id())).body(dto);
    }

    /** delete a playlist */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // -------------- SONG MANAGEMENT --------------------

    /** add a song to the playlist*/
    @PostMapping("/{id}/songs/{songId}")
    public ResponseEntity<PlaylistDto> addSong(@PathVariable Long id, @PathVariable Long songId) {
        // returns the updated Playlist DTO so the frontend can refresh the song list immediately
        return ResponseEntity.ok(service.addSong(id, songId));
    }

    /** Remove a song from the playlist */
    @DeleteMapping("/{id}/songs/{songId}")
    public ResponseEntity<PlaylistDto> removeSong(@PathVariable Long id, @PathVariable Long songId) {
        return ResponseEntity.ok(service.removeSong(id, songId));
    }
}
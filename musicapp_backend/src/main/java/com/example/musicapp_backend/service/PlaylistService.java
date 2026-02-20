package com.example.musicapp_backend.service;

import com.example.musicapp_backend.dto.PlaylistCreateRequest;
import com.example.musicapp_backend.dto.PlaylistDto;
import com.example.musicapp_backend.exception.NotFoundException;
import com.example.musicapp_backend.model.Playlist;
import com.example.musicapp_backend.model.Song;
import com.example.musicapp_backend.model.User;
import com.example.musicapp_backend.repository.PlaylistRepository;
import com.example.musicapp_backend.repository.SongRepository;
import com.example.musicapp_backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional // CRITICAL: Ensures data integrity and handles lazy loading
public class PlaylistService {

    private final PlaylistRepository playlistRepo;
    private final SongRepository songRepo;
    private final UserRepository userRepo;

    public PlaylistService(PlaylistRepository playlistRepo, SongRepository songRepo, UserRepository userRepo) {
        this.playlistRepo = playlistRepo;
        this.songRepo = songRepo;
        this.userRepo = userRepo;
    }

    // -------------------- READ --------------------

    @Transactional(readOnly = true) // Optimization for read operations
    public List<PlaylistDto> all() {
        return playlistRepo.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlaylistDto get(Long id) {
        Playlist playlist = playlistRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Playlist not found: " + id));
        return toDto(playlist);
    }

    @Transactional(readOnly = true)
    public List<PlaylistDto> findAllByUserId(Long userId) {
        return playlistRepo.findByUserId(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PlaylistDto> findAllByUserEmail(String email) {
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found: " + email));
        return findAllByUserId(user.getId());
    }

    @Transactional(readOnly = true)
    public List<PlaylistDto> findAllByUsername(String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));
        return findAllByUserId(user.getId());
    }

    // -------------------- WRITE --------------------

    public PlaylistDto create(PlaylistCreateRequest req) {
        if (req.userId() == null) throw new IllegalArgumentException("User ID is required for creation.");
        validateCommon(req);

        User user = userRepo.findById(req.userId())
                .orElseThrow(() -> new NotFoundException("User not found: " + req.userId()));

        Playlist playlist = new Playlist();
        playlist.setName(req.name());
        playlist.setUser(user);

        Playlist saved = playlistRepo.save(playlist);
        return toDto(saved);
    }

    /** create a playlist for a user identified by username (from JWT token) */
    public PlaylistDto createForUser(PlaylistCreateRequest req, String username) {
        validateCommon(req);

        // Find user by username (from JWT token)
        // JWT token contains username (not email)
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));

        Playlist playlist = new Playlist();
        playlist.setName(req.name());
        playlist.setUser(user);

        Playlist saved = playlistRepo.save(playlist);
        return toDto(saved);
    }

    public PlaylistDto update(Long id, PlaylistCreateRequest req) {
        validateCommon(req);

        Playlist playlist = playlistRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Playlist not found: " + id));

        // Do NOT update the User (Ownership) here
        // Only update modifiable fields like 'name'.
        playlist.setName(req.name());

        Playlist updated = playlistRepo.save(playlist);
        return toDto(updated);
    }

    public void delete(Long id) {
        Playlist playlist = playlistRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Playlist not found: " + id));

        // NOTE: Because we have @Transactional, this lazy-loaded
        // 'getSongs()' call is safe
        playlist.getSongs().forEach(song -> song.getPlaylists().remove(playlist));

        playlistRepo.delete(playlist);
    }

    // -------------------- SONG MANAGEMENT --------------------

    public PlaylistDto addSong(Long playlistId, Long songId) {
        Playlist playlist = playlistRepo.findById(playlistId)
                .orElseThrow(() -> new NotFoundException("Playlist not found: " + playlistId));
        Song song = songRepo.findById(songId)
                .orElseThrow(() -> new NotFoundException("Song not found: " + songId));

        playlist.addSong(song);

        Playlist updated = playlistRepo.save(playlist);
        return toDto(updated);
    }

    public PlaylistDto removeSong(Long playlistId, Long songId) {
        Playlist playlist = playlistRepo.findById(playlistId)
                .orElseThrow(() -> new NotFoundException("Playlist not found: " + playlistId));
        Song song = songRepo.findById(songId)
                .orElseThrow(() -> new NotFoundException("Song not found: " + songId));

        playlist.removeSong(song);

        Playlist updated = playlistRepo.save(playlist);
        return toDto(updated);
    }

    // -------------------- VALIDATION --------------------

    private void validateCommon(PlaylistCreateRequest req) {
        if (req == null) throw new IllegalArgumentException("Request body is required.");
        if (req.name() == null || req.name().isBlank()) throw new IllegalArgumentException("Playlist name is required.");
    }

    // -------------------- MAPPING --------------------

    private PlaylistDto toDto(Playlist playlist) {
        return new PlaylistDto(
                playlist.getId(),
                playlist.getName(),
                playlist.getUser() != null ? playlist.getUser().getId() : null,
                playlist.getSongs().stream()
                        .map(Song::getId)
                        .collect(Collectors.toSet())
        );
    }
}
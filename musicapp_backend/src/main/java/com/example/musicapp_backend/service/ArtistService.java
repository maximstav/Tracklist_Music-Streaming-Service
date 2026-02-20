package com.example.musicapp_backend.service;

import com.example.musicapp_backend.dto.ArtistCreateRequest;
import com.example.musicapp_backend.dto.ArtistDto;
import com.example.musicapp_backend.exception.NotFoundException;
import com.example.musicapp_backend.model.Artist;
import com.example.musicapp_backend.repository.ArtistRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ArtistService {

    private final ArtistRepository artistRepo;

    public ArtistService(ArtistRepository artistRepo) {
        this.artistRepo = artistRepo;
    }

    // -------------------- READ --------------------

    public List<ArtistDto> all() {
        return artistRepo.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public ArtistDto get(Long id) {
        Artist artist = artistRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Artist not found: " + id));
        return toDto(artist);
    }

    public List<ArtistDto> searchByName(String q) {
        return artistRepo.findByNameContainingIgnoreCase(q).stream()
                .map(this::toDto)
                .toList();
    }

    // -------------------- WRITE --------------------

    public ArtistDto create(ArtistCreateRequest req) {
        validate(req);

        Artist artist = new Artist();
        artist.setName(req.name());
        artist.setGenre(req.genre()); // optional

        Artist saved = artistRepo.save(artist);
        return toDto(saved);
    }

    public ArtistDto update(Long id, ArtistCreateRequest req) {
        validate(req);

        Artist artist = artistRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Artist not found: " + id));

        artist.setName(req.name());
        artist.setGenre(req.genre());

        Artist updated = artistRepo.save(artist);
        return toDto(updated);
    }

    public void delete(Long id) {
        Artist artist = artistRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Artist not found: " + id));
        // in the database, the artist may still have albums that will crash the "delete" operation
        if (!artist.getAlbums().isEmpty()) {
            throw new IllegalStateException("Cannot delete artist: " + id + " because they are associated with "
                    + artist.getAlbums().size() + " album(s).");
        }
        // artists can exist without albums
        // they may still have songs though, so there still is a risk of failure to delete if their songs exist
        if (!artist.getSongs().isEmpty()) {
            throw new IllegalStateException("Cannot delete artist: " + id + " because they are associated with songs.");
        }
        artistRepo.delete(artist);
    }

    // -------------------- VALIDATION --------------------

    private void validate(ArtistCreateRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Request body is required.");
        }
        if (req.name() == null || req.name().isBlank()) {
            throw new IllegalArgumentException("Artist name is required and cannot be blank.");
        }
        // genre is optional → no validation
    }

    // -------------------- MAPPING --------------------

    private ArtistDto toDto(Artist artist) {
        return new ArtistDto(
                artist.getId(),
                artist.getName(),
                artist.getGenre(),
                artist.getSongs().stream().map(s -> s.getId()).toList(),
                artist.getSongs().stream().map(s -> s.getTitle()).toList(),
                artist.getAlbums().stream().map(a -> a.getId()).toList(),
                artist.getAlbums().stream().map(a -> a.getTitle()).toList()
        );
    }
}
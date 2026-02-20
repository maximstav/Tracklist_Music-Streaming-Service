package com.example.musicapp_backend.service;

import com.example.musicapp_backend.dto.AlbumCreateRequest;
import com.example.musicapp_backend.dto.AlbumDto;
import com.example.musicapp_backend.exception.NotFoundException;
import com.example.musicapp_backend.model.Album;
import com.example.musicapp_backend.model.Artist;
import com.example.musicapp_backend.model.Song;
import com.example.musicapp_backend.repository.AlbumRepository;
import com.example.musicapp_backend.repository.ArtistRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AlbumService {

    private final AlbumRepository albumRepo;
    private final ArtistRepository artistRepo;
    private final StorageService storageService;

    public AlbumService(AlbumRepository albumRepo, ArtistRepository artistRepo,
            StorageService storageService) {
        this.albumRepo = albumRepo;
        this.artistRepo = artistRepo;
        this.storageService = storageService;
    }

    // -------------- READ --------------------

    public List<AlbumDto> all() {
        return albumRepo.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public AlbumDto get(Long id) {
        Album album = albumRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Album not found: " + id));
        return toDto(album);
    }

    /**
     * returns the raw S3 key for album cover art. Used internally by the cover endpoint
     * this avoids exposing the S3 key in the DTO
     */
    public String getCoverArtS3Key(Long id) {
        Album album = albumRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Album not found: " + id));
        return album.getCoverArtS3Key();
    }

    public List<AlbumDto> searchByTitle(String q) {
        return albumRepo.findByTitleContainingIgnoreCase(q).stream()
                .map(this::toDto)
                .toList();
    }

    public List<AlbumDto> searchByArtist(String artistName) {
        return albumRepo.findByArtist_NameIgnoreCase(artistName).stream()
                .map(this::toDto)
                .toList();
    }

    // -------------------- WRITE ---------------

    public AlbumDto create(AlbumCreateRequest req) {
        validate(req);

        Artist artist = artistRepo.findById(req.artistId())
                .orElseThrow(() -> new NotFoundException("Artist not found: " + req.artistId()));

        Album album = new Album();
        album.setTitle(req.title());
        album.setReleaseYear(req.releaseYear());
        album.setArtist(artist);

        if (req.coverArtS3Key() != null) {
            album.setCoverArtS3Key(req.coverArtS3Key());
        }

        Album saved = albumRepo.save(album);
        return toDto(saved);
    }

    public AlbumDto update(Long id, AlbumCreateRequest req) {
        validate(req);

        Album album = albumRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Album not found: " + id));

        Artist artist = artistRepo.findById(req.artistId())
                .orElseThrow(() -> new NotFoundException("Artist not found: " + req.artistId()));

        album.setTitle(req.title());
        album.setReleaseYear(req.releaseYear());
        album.setArtist(artist);
        album.setCoverArtS3Key(req.coverArtS3Key());

        Album updated = albumRepo.save(album);
        return toDto(updated);
    }

    public void delete(Long id) {
        Album album = albumRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Album not found: " + id));
        if (!album.getSongs().isEmpty()) {
            throw new IllegalStateException("Cannot delete album: " + id + " because it is associated with "
                    + album.getSongs().size() + " song(s).");
        }
        albumRepo.delete(album);
        // Clean up the S3 cover art file
        storageService.safeDelete(album.getCoverArtS3Key());
    }

    // -------------------- VALIDATION --------------------

    private void validate(AlbumCreateRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Request body is required.");
        }
        if (req.title() == null || req.title().isBlank()) {
            throw new IllegalArgumentException("Album title is required and cannot be blank.");
        }
        if (req.releaseYear() <= 0) {
            throw new IllegalArgumentException("releaseYear must be a valid positive year.");
        }
        if (req.artistId() == null) {
            throw new IllegalArgumentException("artistId is required.");
        }
    }

    // -------------------- MAPPING --------------------

    private AlbumDto toDto(Album album) {
        return new AlbumDto(
                album.getId(),
                album.getTitle(),
                album.getReleaseYear(),
                album.getArtist() != null ? album.getArtist().getId() : null,
                album.getArtist() != null ? album.getArtist().getName() : null,
                album.getCoverArtS3Key() != null && !album.getCoverArtS3Key().isBlank(),
                album.getSongs().stream().map(Song::getId).toList());
    }
}

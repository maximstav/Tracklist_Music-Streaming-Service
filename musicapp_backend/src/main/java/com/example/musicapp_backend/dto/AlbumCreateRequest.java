package com.example.musicapp_backend.dto;

public record AlbumCreateRequest(
        String title,
        int releaseYear,
        Long artistId,
        String coverArtS3Key
) {}

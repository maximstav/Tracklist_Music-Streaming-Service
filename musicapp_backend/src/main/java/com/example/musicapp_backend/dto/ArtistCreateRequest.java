package com.example.musicapp_backend.dto;

public record ArtistCreateRequest(
        String name,
        String genre // optional
) {}

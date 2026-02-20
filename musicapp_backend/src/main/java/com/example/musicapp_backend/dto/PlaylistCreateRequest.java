package com.example.musicapp_backend.dto;

public record PlaylistCreateRequest(
        String name,
        Long userId
) {}

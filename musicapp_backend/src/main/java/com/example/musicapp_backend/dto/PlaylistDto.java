package com.example.musicapp_backend.dto;

import java.util.Set;

public record PlaylistDto(
        Long id,
        String name,
        Long userId,
        Set<Long> songIds
) {
}
package com.example.musicapp_backend.dto;

import java.util.List;

public record ArtistDto(
        Long id,
        String name,
        String genre,
        List<Long> songIds,
        List<String> songTitles,
        List<Long> albumIds,
        List<String> albumTitles
) {}

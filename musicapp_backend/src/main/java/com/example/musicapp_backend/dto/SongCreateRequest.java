package com.example.musicapp_backend.dto;

import java.util.List;

public record SongCreateRequest(
        String title,
        Integer duration,
        String s3Key,
        Long albumId,
        List<Long> artistIds
) {}

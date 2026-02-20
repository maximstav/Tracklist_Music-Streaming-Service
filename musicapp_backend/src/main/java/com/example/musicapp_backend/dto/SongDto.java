package com.example.musicapp_backend.dto;

import java.util.List;

public record SongDto(
                Long id,
                String title,
                Integer duration,
                boolean hasAudio,
                Long albumId,
                String albumTitle,
                List<Long> artistIds,
                List<String> artistNames) {
}
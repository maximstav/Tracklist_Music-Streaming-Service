package com.example.musicapp_backend.dto;

import java.util.List;

public record AlbumDto(
                Long id,
                String title,
                int releaseYear,
                Long artistId,
                String artistName,
                boolean hasCoverArt,
                List<Long> songIds) {
}

package com.example.musicapp_backend.repository;

import com.example.musicapp_backend.model.Song;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SongRepository extends JpaRepository<Song, Long> {
    List<Song> findByTitleContainingIgnoreCase(String title);

    List<Song> findByArtists_NameContainingIgnoreCase(String name);

    List<Song> findByAlbum_TitleContainingIgnoreCase(String albumTitle);
}

// List<Song> findByTitleContainingIgnoreCase(String q);
// List<Song> findByArtist_NameIgnoreCase(String artistName);

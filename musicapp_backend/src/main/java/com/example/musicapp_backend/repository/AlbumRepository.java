package com.example.musicapp_backend.repository;

import com.example.musicapp_backend.model.Album;
import com.example.musicapp_backend.model.Artist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlbumRepository extends JpaRepository<Album, Long> {
//    List<Album> findByArtist(Artist artist);
    List<Album> findByTitleContainingIgnoreCase(String title);
    List<Album> findByArtist_NameIgnoreCase(String artistName);
}

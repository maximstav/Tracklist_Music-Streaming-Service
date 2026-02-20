package com.example.musicapp_backend.repository;

import com.example.musicapp_backend.model.Playlist;
import com.example.musicapp_backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlaylistRepository extends JpaRepository<Playlist, Long> {
//    List<Playlist> findByUser(User user);
    List<Playlist> findByUserId(Long userId);
}

package com.example.musicapp_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // no setter

    @Setter
    private String username;

    @Setter
    private String email;

    @Setter
    private String role; // USER / ARTIST / ADMIN

    @JsonIgnore
    @Setter
    private String password; // stored hashed

    @OneToMany(mappedBy = "user")
    private List<Playlist> playlists = new ArrayList<>(); // no setter

    public void addPlaylist(Playlist playlist) {
        playlists.add(playlist);
        playlist.setUser(this);
    }

    public void removePlaylist(Playlist playlist) {
        playlists.remove(playlist);
        playlist.setUser(null);
    }
}

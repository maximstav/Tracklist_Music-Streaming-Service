package com.example.musicapp_backend.model;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "artists")
@Getter
@NoArgsConstructor
@EqualsAndHashCode(of = "id")
public class Artist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter
    private String name;

    @Setter
    private String genre;

    @OneToMany(mappedBy = "artist")
    private List<Album> albums = new ArrayList<>();

    @ManyToMany(mappedBy = "artists")
    private Set<Song> songs = new HashSet<>();

    public Artist(String name) {this.name = name;}

    // Helper methods to safely manage collections
    public void addAlbum(Album album) {
        albums.add(album);
        album.setArtist(this);
    }

    public void removeAlbum(Album album) {
        albums.remove(album);
        album.setArtist(null);
    }

    public void addSong(Song song) {
        songs.add(song);
        song.getArtists().add(this);
    }

    public void removeSong(Song song) {
        songs.remove(song);
        song.getArtists().remove(this);
    }
}
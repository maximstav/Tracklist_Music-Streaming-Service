package com.example.musicapp_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "songs")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // no setter

    @Setter
    private String title;

    @Setter
    private int duration; // seconds

    @Setter
    private String s3Key; // S3 object key for the audio file

    @ManyToOne
    @JoinColumn(name = "album_id")
    @Setter
    private Album album;

    @ManyToMany(mappedBy = "songs")
    private Set<Playlist> playlists = new HashSet<>(); // no setter

    @ManyToMany
    @JoinTable(
            name = "song_artists",
            joinColumns = @JoinColumn(name = "song_id"),
            inverseJoinColumns = @JoinColumn(name = "artist_id")
    )
    private Set<Artist> artists = new HashSet<>(); // no setter

    // -- manage collections safely --
    public void setArtists(Set<Artist> artists) {
        this.artists.clear();
        for (Artist artist : artists) addArtist(artist);
    }

    public void addArtist(Artist artist) {
        artists.add(artist);
        artist.getSongs().add(this);
    }

    public void removeArtist(Artist artist) {
        artists.remove(artist);
        artist.getSongs().remove(this);
    }

    public void addPlaylist(Playlist playlist) {
        playlists.add(playlist);
        playlist.getSongs().add(this);
    }

    public void removePlaylist(Playlist playlist) {
        playlists.remove(playlist);
        playlist.getSongs().remove(this);
    }
}

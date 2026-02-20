package com.example.musicapp_backend.controller;

import com.example.musicapp_backend.dto.ArtistCreateRequest;
import com.example.musicapp_backend.dto.ArtistDto;
import com.example.musicapp_backend.service.ArtistService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/artists")
public class ArtistController {

    private final ArtistService service;

    public ArtistController(ArtistService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ArtistDto>> all() {
        return ResponseEntity.ok(service.all());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArtistDto> one(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    public ResponseEntity<ArtistDto> create(@RequestBody ArtistCreateRequest req) {
        ArtistDto dto = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/artists/" + dto.id())).body(dto);
    }
}
package com.entc.controller;

//import org.springframework.web.bind.annotation.RequestBody;
//import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import com.entc.dao.TransformerDetails;
import com.entc.service.TransformerService;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.net.URI;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/transformers")
public class TransformerController {

    private final TransformerService service;

    public TransformerController(TransformerService service) {
        this.service = service;
    }

    private Long requireUserId(String header) {
        if (header == null || header.isBlank())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id");
        try { return Long.valueOf(header); }
        catch (NumberFormatException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bad X-User-Id"); }
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestHeader("X-User-Id") String xUserId,
            @RequestBody TransformerDetails body,
            UriComponentsBuilder uriBuilder) {

        if (body == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Request body is required"));
        }
        if (body.getTransformerNo() == null || body.getTransformerNo().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "transformerNo is required"));
        }
        if (body.getFavorite() == null) body.setFavorite(false);

        try {
            Long userId = requireUserId(xUserId);
            TransformerDetails saved = service.create(userId, body);

            URI location = uriBuilder.path("/transformers/{id}")
                                     .buildAndExpand(saved.getId())
                                     .toUri();
            return ResponseEntity.created(location).body(saved);

        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(409).body(Map.of(
                "message", "A transformer with this transformerNo already exists",
                "detail", ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage()
            ));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to create transformer", "detail", ex.getMessage()));
        }
    }

    @GetMapping
    public List<TransformerDetails> getAll(@RequestHeader("X-User-Id") String xUserId) {
        Long userId = requireUserId(xUserId);
        return service.getAll(userId);
    }

    @GetMapping("/{id}")
    public TransformerDetails getById(@RequestHeader("X-User-Id") String xUserId, @PathVariable Long id) {
        Long userId = requireUserId(xUserId);
        return service.getById(userId, id);
    }

    @GetMapping("/by-no")
    public TransformerDetails getByTransformerNo(
            @RequestHeader("X-User-Id") String xUserId,
            @RequestParam("no") String transformerNo) {
        Long userId = requireUserId(xUserId);
        return service.getByTransformerNo(userId, transformerNo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editById(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long id,
            @RequestBody TransformerDetails body) {

        if (body == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Request body is required"));
        }
        if (body.getTransformerNo() == null || body.getTransformerNo().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "transformerNo is required"));
        }

        try {
            Long userId = requireUserId(xUserId);
            TransformerDetails updated = service.update(userId, id, body);
            if (updated == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(updated);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to update transformer", "detail", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long id) {
        Long userId = requireUserId(xUserId);
        service.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}

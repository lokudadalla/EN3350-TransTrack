package com.entc.controller;

//import org.springframework.web.bind.annotation.RequestBody;
//import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import com.entc.dao.TransformerDetails;
import com.entc.service.TransformerService;
import org.springframework.http.ResponseEntity;
import java.net.URI;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


import java.util.List;

@RestController
@RequestMapping("/transformers")
public class TransformerController {
	
	private final TransformerService service;

	public TransformerController(TransformerService service) {
        this.service = service;
    }

	@PostMapping
	public ResponseEntity<?> create(@RequestBody TransformerDetails body,
	                                UriComponentsBuilder uriBuilder) {
	    // If request has no data return Error.
	    if (body == null) {
	        return ResponseEntity.badRequest().body(Map.of(
	                "message", "Request body is required"
	        ));
	    }
	    // If request has no transformer Id return Exception
	    if (body.getTransformerNo() == null || body.getTransformerNo().isBlank()) {
	        return ResponseEntity.badRequest().body(Map.of(
	                "message", "transformerNo is required"
	        ));
	    }

	    // set default favorite if not provided Favorite details
	    if (body.getFavorite() == null) body.setFavorite(false);

	    try {
	        // Create object
	        TransformerDetails saved = service.create(body);

	        // Defensive: ID should be present after save
	        if (saved.getId() == null) {
	            // If created object doesn't return ID immediately, return 200 OK.
	            return ResponseEntity.ok(saved);
	        }

	        // Build Location header safely
	        URI location = uriBuilder
	                .path("/api/transformers/{id}")
	                .buildAndExpand(saved.getId())
	                .toUri();

	        // Return 201 Created with body and Location
	        return ResponseEntity.created(location).body(saved);

	    } catch (org.springframework.dao.DataIntegrityViolationException ex) {
	       
	        return ResponseEntity.status(409).body(Map.of(
	                "message", "A transformer with this transformerNo already exists",
	                "detail", ex.getMostSpecificCause() != null
	                        ? ex.getMostSpecificCause().getMessage()
	                        : ex.getMessage()
	        ));
	    } catch (Exception ex) {
	        // Fallback error
	        return ResponseEntity.status(500).body(Map.of(
	                "message", "Failed to create transformer",
	                "detail", ex.getMessage()
	        ));
	    }
	}


    // Get all
    @GetMapping
    public List<TransformerDetails> getAll() {
        return service.getAll();
    }

    // Get by ID
    @GetMapping("/{id}")
    public TransformerDetails getById(@PathVariable Long id) {
        return service.getById(id);
    }

    // Get by transformer No.
    @GetMapping("/by-no")
    public TransformerDetails getByTransformerNo(@RequestParam("no") String transformerNo) {
        return service.getByTransformerNo(transformerNo);
    }
    
    // Edit existing transformer data
    @PutMapping("/{id}")
    public ResponseEntity<?> editById(@PathVariable Long id, @RequestBody TransformerDetails body) {
        if (body == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Request body is required"
            ));
        }
        if (body.getTransformerNo() == null || body.getTransformerNo().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "transformerNo is required"
            ));
        }

        try {
            TransformerDetails updated = service.update(id, body);

            if (updated == null) {
                return ResponseEntity.notFound().build(); // transformer with given ID not found
            }

            return ResponseEntity.ok(updated);

        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of(
                    "message", "Failed to update transformer",
                    "detail", ex.getMessage()
            ));
        }
    }																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																   
    // Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

}
	

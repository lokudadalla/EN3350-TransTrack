package com.entc.controller;

import com.entc.dao.InspectionDetails;
import com.entc.dao.TransformerDetails;
import com.entc.service.InspectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("inspections")
public class InspectionController {

    @Autowired
    InspectionService inspectionService;

    @GetMapping
    List<InspectionDetails> getAllInspections() {
        return inspectionService.getAllInspections();
    }

    @PostMapping
    public ResponseEntity<InspectionDetails> create(@RequestBody InspectionDetails body) {
        InspectionDetails created = inspectionService.create(body);
        URI location = URI.create("/inspections/" + created.getInspectionNo());
        return ResponseEntity.created(location).body(created);
    }

    // Get by transformer No.
    @GetMapping("/by-no")
    public List<InspectionDetails> getByTransformerNo(@RequestParam("no") String transformerNo) {
        return inspectionService.getAllInspectionByTransformerNo(transformerNo);
    }

    @GetMapping("/{id}")
    public InspectionDetails getOne(@PathVariable Long id) {
        return inspectionService.getById(id);
    }

    // Edit existing inspection data
    @PutMapping("/{id}")
    public ResponseEntity<?> editById(@PathVariable Long id, @RequestBody InspectionDetails body) {
        if (body == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Request body is required"
            ));
        }
        if (body.getInspectionNo() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "inspectionNo is required"
            ));
        }

        try {
            InspectionDetails updated = inspectionService.update(id, body);

            if (updated == null) {
                return ResponseEntity.notFound().build(); // transformer with given ID not found
            }

            return ResponseEntity.ok(updated);

        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of(
                    "message", "Failed to update inspection",
                    "detail", ex.getMessage()
            ));
        }
    }
    // Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inspectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

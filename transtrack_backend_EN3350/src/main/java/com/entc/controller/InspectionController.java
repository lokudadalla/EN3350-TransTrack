package com.entc.controller;

import com.entc.dao.InspectionDetails;
import com.entc.dao.TransformerDetails;
import com.entc.service.InspectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.Map;




@RestController
@RequestMapping("inspections")
public class InspectionController {

    private final InspectionService inspectionService;

    public InspectionController(InspectionService inspectionService) {
        this.inspectionService = inspectionService;
    }

    private Long requireUserId(String header) {
    	  if (header == null || header.isBlank())
    	    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id");
    	  try { return Long.valueOf(header); }
    	  catch (NumberFormatException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bad X-User-Id"); }
    	}


    @GetMapping
    List<InspectionDetails> getAllInspections(@RequestHeader("X-User-Id") String xUserId) {
        return inspectionService.getAllInspections(requireUserId(xUserId));
    }

    @PostMapping
    public ResponseEntity<InspectionDetails> create(
        @RequestHeader("X-User-Id") String xUserId,
        @RequestBody InspectionDetails body
    ) {
        var created = inspectionService.create(requireUserId(xUserId), body);
        URI location = URI.create("/inspections/" + created.getInspectionNo());
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/by-no")
    public List<InspectionDetails> getByTransformerNo(
        @RequestHeader("X-User-Id") String xUserId,
        @RequestParam("no") String transformerNo
    ) {
        return inspectionService.getAllInspectionByTransformerNo(requireUserId(xUserId), transformerNo);
    }

    @GetMapping("/{id}")
    public InspectionDetails getOne(
        @RequestHeader("X-User-Id") String xUserId,
        @PathVariable Long id
    ) {
        return inspectionService.getById(requireUserId(xUserId), id);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editById(
        @RequestHeader("X-User-Id") String xUserId,
        @PathVariable Long id,
        @RequestBody InspectionDetails body
    ) {
        if (body == null || body.getInspectionNo() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "inspectionNo is required"));
        }
        var updated = inspectionService.update(requireUserId(xUserId), id, body);
        return updated == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @RequestHeader("X-User-Id") String xUserId,
        @PathVariable Long id
    ) {
        inspectionService.delete(requireUserId(xUserId), id);
        return ResponseEntity.noContent().build();
    }
}

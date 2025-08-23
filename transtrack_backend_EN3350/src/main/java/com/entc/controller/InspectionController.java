package com.entc.controller;

import com.entc.dao.InspectionDetails;
import com.entc.service.InspectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

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

    @GetMapping("/{id}")
    public InspectionDetails getOne(@PathVariable Long id) {
        return inspectionService.getById(id);
    }
}

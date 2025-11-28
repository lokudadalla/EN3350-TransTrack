package com.entc.controller;

import com.entc.dto.MaintenanceRecordDto;
import com.entc.dto.MaintenanceRecordUpdateRequest;
import com.entc.service.MaintenanceRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class MaintenanceRecordController {

    private final MaintenanceRecordService service;

    private Long requireUserId(String header) {
        if (header == null || header.isBlank())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id");
        try {
            return Long.valueOf(header);
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bad X-User-Id");
        }
    }

    @PostMapping("/inspections/{inspectionId}/maintenance-record")
    public ResponseEntity<MaintenanceRecordDto> create(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId
    ) {
        Long userId = requireUserId(xUserId);
        var dto = service.createFromInspection(userId, inspectionId);
        return ResponseEntity
                .created(URI.create("/maintenance-records/" + dto.getId()))
                .body(dto);
    }

    @GetMapping("/inspections/{inspectionId}/maintenance-record")
    public MaintenanceRecordDto getForInspection(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId
    ) {
        return service.getForInspection(requireUserId(xUserId), inspectionId);
    }

    @PutMapping("/maintenance-records/{recordId}")
    public MaintenanceRecordDto update(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long recordId,
            @RequestBody MaintenanceRecordUpdateRequest body
    ) {
        return service.update(requireUserId(xUserId), recordId, body);
    }

    @GetMapping("/transformers/{transformerNo}/maintenance-records")
    public List<MaintenanceRecordDto> history(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable String transformerNo
    ) {
        return service.listForTransformer(requireUserId(xUserId), transformerNo);
    }

    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleRuntime(RuntimeException e) {
        return Map.of("message", e.getMessage());
    }
}

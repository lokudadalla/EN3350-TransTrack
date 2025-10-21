package com.entc.controller;

import com.entc.dao.EnvironmentCondition;
import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import com.entc.dto.InspectionImageDto;
import com.entc.dto.AnomalyUpsertDto;
import com.entc.service.InferenceService;
import com.entc.service.InspectionImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/inspections/{inspectionId}/images")
@RequiredArgsConstructor
public class InspectionImageController {

    private final InspectionImageService imageService;
    private final InferenceService inferenceService; // ⬅️ added for URL-mode inference

    private Long requireUserId(String header) {
        if (header == null || header.isBlank())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id");
        try {
            return Long.valueOf(header);
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bad X-User-Id");
        }
    }

    // POST /inspections/{inspectionId}/images?type=BASELINE|MAINTENANCE
    // files are sent as multipart part name "files"
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<InspectionImageDto> upload(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @RequestParam ImageType type,
            @RequestParam String uploader,
            @RequestParam(required = false) EnvironmentCondition condition,
            @RequestPart("files") List<MultipartFile> files
    ) throws IOException {

        Long userId = requireUserId(xUserId);

        var saved = imageService.upload(userId, inspectionId, type, uploader, condition, files);

        // For MAINTENANCE: immediately run inference (URL mode) and return the image with anomalies
        if (type == ImageType.MAINTENANCE) {
            if (saved.size() != 1) {
                throw new IOException("Exactly one MAINTENANCE image must be uploaded at a time");
            }
            var withAnoms = inferenceService.runForMaintenance(userId, inspectionId, saved.get(0).getId());
            System.out.println("returning MAINTENANCE image with anomalies:" + withAnoms.getAiAnomaliesJson());
            return List.of(InspectionImageDto.from(withAnoms));
        }

        // For BASELINE (and others): just return what was saved
        return saved.stream().map(InspectionImageDto::from).toList();
    }

    // GET /inspections/{inspectionId}/images[?type=...]
    @GetMapping
    public List<InspectionImageDto> list(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @RequestParam(required = false) ImageType type
    ) {
        Long userId = requireUserId(xUserId);
        return imageService.list(userId, inspectionId, type)
                .stream().map(InspectionImageDto::from).toList();
    }

    // GET /inspections/{inspectionId}/images/{imageId}/file
    @GetMapping("/{imageId}/file")
    public ResponseEntity<Resource> file(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @PathVariable Long imageId
    ) throws IOException {
        var img = imageService.get(requireUserId(xUserId), inspectionId, imageId);
        Resource r = new FileSystemResource(img.getStoragePath());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(img.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + img.getFileName() + "\"")
                .body(r);
    }

    // DELETE /inspections/{inspectionId}/images/{imageId}
    @DeleteMapping("/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @PathVariable Long imageId
    ) throws IOException {
        imageService.delete(requireUserId(xUserId), inspectionId, imageId);
    }

    @PutMapping("/{imageId}/anomalies")
    public InspectionImageDto replaceAnomalies(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @PathVariable Long imageId,
            @RequestBody List<AnomalyUpsertDto> body
    ) throws IOException {
        InspectionImage updated = imageService.replaceAnomalies(
                requireUserId(xUserId), inspectionId, imageId, body);
        return InspectionImageDto.from(updated);
    }

    @DeleteMapping("/{imageId}/anomalies/{anomalyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAnomaly(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @PathVariable Long imageId,
            @PathVariable Long anomalyId
    ) throws IOException {
        imageService.deleteAnomaly(
                requireUserId(xUserId),
                inspectionId,
                imageId,
                anomalyId
        );
    }
}
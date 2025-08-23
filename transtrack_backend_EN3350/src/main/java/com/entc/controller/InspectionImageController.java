package com.entc.controller;

import com.entc.dto.InspectionImageDto;
import com.entc.model.ImageType;
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

import java.io.IOException;
import java.util.List;

// src/main/java/com/entc/controller/InspectionImageController.java
@RestController
@RequestMapping("/inspections/{inspectionId}/images")
@RequiredArgsConstructor
public class InspectionImageController {

    private final InspectionImageService imageService;

    // POST /inspections/{id}/images?type=BASELINE  (files as "files")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<InspectionImageDto> upload(
            @PathVariable Long inspectionId,
            @RequestParam ImageType type,
            @RequestPart("files") List<MultipartFile> files
    ) throws IOException {
        return imageService.upload(inspectionId, type, files).stream().map(InspectionImageDto::from).toList();
    }

    // GET /inspections/{id}/images[?type=MAINTENANCE]
    @GetMapping
    public List<InspectionImageDto> list(
            @PathVariable Long inspectionId,
            @RequestParam(required = false) ImageType type
    ) {
        return imageService.list(inspectionId, type).stream().map(InspectionImageDto::from).toList();
    }

    // GET /inspections/{id}/images/{imageId}/file
    @GetMapping("/{imageId}/file")
    public ResponseEntity<Resource> file(@PathVariable Long inspectionId, @PathVariable Long imageId) throws IOException {
        var img = imageService.get(inspectionId, imageId);
        Resource r = new FileSystemResource(img.getStoragePath());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(img.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + img.getFileName() + "\"")
                .body(r);
    }

    // DELETE /inspections/{id}/images/{imageId}
    @DeleteMapping("/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long inspectionId, @PathVariable Long imageId) throws IOException {
        imageService.delete(inspectionId, imageId);
    }
}


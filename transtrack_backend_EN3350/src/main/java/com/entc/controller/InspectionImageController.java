package com.entc.controller;

import com.entc.dao.EnvironmentCondition;
import com.entc.dto.InspectionImageDto;
import com.entc.dao.ImageType;
import com.entc.service.InspectionImageService;
import com.entc.service.TransformerService;

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

// src/main/java/com/entc/controller/InspectionImageController.java

@RestController
@RequestMapping("/inspections/{inspectionId}/images")
@RequiredArgsConstructor
public class InspectionImageController {

    private final InspectionImageService imageService;
    
    private Long requireUserId(String header) {
    	  if (header == null || header.isBlank())
    	    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id");
    	  try { return Long.valueOf(header); }
    	  catch (NumberFormatException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bad X-User-Id"); }
    	}


    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<InspectionImageDto> upload(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @RequestParam ImageType type,
            @RequestParam String uploader,
            @RequestParam(required = false) EnvironmentCondition condition,
            @RequestPart("files") List<MultipartFile> files
    ) throws IOException {
        return imageService.upload(requireUserId(xUserId), inspectionId, type, uploader, condition, files)
                .stream().map(InspectionImageDto::from).toList();
    }

    @GetMapping
    public List<InspectionImageDto> list(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @RequestParam(required = false) ImageType type
    ) {
        return imageService.list(requireUserId(xUserId), inspectionId, type)
                .stream().map(InspectionImageDto::from).toList();
    }

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

    @DeleteMapping("/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader("X-User-Id") String xUserId,
            @PathVariable Long inspectionId,
            @PathVariable Long imageId
    ) throws IOException {
        imageService.delete(requireUserId(xUserId), inspectionId, imageId);
    }
}



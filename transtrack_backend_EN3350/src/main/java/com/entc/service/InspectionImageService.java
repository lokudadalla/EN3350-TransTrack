package com.entc.service;

import com.entc.dao.InspectionDetails;
import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import com.entc.repository.InspectionImageRepository;
import com.entc.repository.InspectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InspectionImageService {

    private final InspectionRepository inspectionRepo;
    private final InspectionImageRepository imageRepo;
    private final StorageService storage;

    @Transactional
    public List<InspectionImage> upload(Long inspectionId, ImageType type, String uploader, List<MultipartFile> files) throws IOException {
        InspectionDetails inspection = inspectionRepo.findById(inspectionId)
                .orElseThrow(() -> new IOException("Inspection not found: " + inspectionId));

        String uploaderSafe = (uploader == null || uploader.isBlank()) ? "unknown" : uploader.trim();

        List<InspectionImage> saved = new ArrayList<>();
        for (MultipartFile f : files) {
            if (f.isEmpty()) continue;
            String ct = Optional.ofNullable(f.getContentType()).orElse("application/octet-stream");
            if (!ct.startsWith("image/")) throw new IllegalArgumentException("Only image/* allowed");

            var stored = storage.store(f, inspectionId, type);

            InspectionImage img = new InspectionImage();
            img.setInspection(inspection);
            img.setType(type);
            img.setFileName(stored.getFileName());
            img.setStoragePath(stored.getStoragePath());
            img.setContentType(stored.getContentType());
            img.setSize(stored.getSize());
            img.setUploadedAt(LocalDateTime.now());
            img.setUploader(uploaderSafe);
            saved.add(imageRepo.save(img));
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<InspectionImage> list(Long inspectionId, @Nullable ImageType type) {
        return type == null
                ? imageRepo.findByInspection_InspectionNo(inspectionId)
                : imageRepo.findByInspection_InspectionNoAndType(inspectionId, type);
    }

    @Transactional(readOnly = true)
    public InspectionImage get(Long inspectionId, Long imageId) throws IOException {
        return imageRepo.findById(imageId)
                .filter(i -> i.getInspection().getInspectionNo().equals(inspectionId))
                .orElseThrow(() -> new IOException("Image not found: " + imageId));
    }

    @Transactional
    public void delete(Long inspectionId, Long imageId) throws IOException {
        InspectionImage img = get(inspectionId, imageId);
        storage.delete(img.getStoragePath());
        imageRepo.delete(img);
    }
}


package com.entc.service;

import com.entc.dao.AnomalyType;
import com.entc.dao.EnvironmentCondition;
import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import com.entc.dao.InspectionImageAnomaly;
import com.entc.dto.AnomalyUpsertDto;
import com.entc.repository.InspectionImageAnomalyRepository;
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
    private final InspectionImageAnomalyRepository anomalyRepo;
    private final StorageService storage;
    private final PythonTrainingService pythonTrainingService;
    

    @Transactional
    public List<InspectionImage> upload(Long userId, Long inspectionId, ImageType type,
                                        String uploader, @Nullable EnvironmentCondition condition,
                                        List<MultipartFile> files) throws IOException {

        var inspection = inspectionRepo.findByInspectionNoAndUserId(inspectionId, userId)
                .orElseThrow(() -> new IOException("Inspection not found"));

        if (type == ImageType.BASELINE && condition == null) {
            throw new IOException("condition is required for BASELINE images.");
        }

        String uploaderSafe = (uploader == null || uploader.isBlank()) ? "unknown" : uploader.trim();

        List<InspectionImage> saved = new ArrayList<>();
        for (MultipartFile f : files) {
            if (f.isEmpty()) continue;
            String ct = Optional.ofNullable(f.getContentType()).orElse("application/octet-stream");
            if (!ct.startsWith("image/")) throw new IllegalArgumentException("Only image/* allowed");

            var stored = storage.store(f, inspectionId, type);

            var img = new InspectionImage();
            img.setInspection(inspection);
            img.setType(type);
            img.setFileName(stored.getFileName());
            img.setStoragePath(stored.getStoragePath());
            img.setContentType(ct);
            img.setSize(stored.getSize());
            img.setUploadedAt(LocalDateTime.now());
            img.setUploader(uploaderSafe);
            img.setCondition(type == ImageType.BASELINE ? condition : null);

            saved.add(imageRepo.save(img));
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<InspectionImage> list(Long userId, Long inspectionId, @Nullable ImageType type) {
        // Use the user-scoped fetch-join queries to avoid N+1 and return newest first
        return (type == null)
                ? imageRepo.findAllWithAnomaliesForUser(inspectionId, userId)
                : imageRepo.findAllWithAnomaliesByTypeForUser(inspectionId, userId, type);
    }

    @Transactional(readOnly = true)
    public InspectionImage get(Long userId, Long inspectionId, Long imageId) throws IOException {
        return imageRepo.findByIdAndInspection_UserId(imageId, userId)
                .filter(i -> i.getInspection().getInspectionNo().equals(inspectionId))
                .orElseThrow(() -> new IOException("Image not found"));
    }

    @Transactional
    public void delete(Long userId, Long inspectionId, Long imageId) throws IOException {
        var img = get(userId, inspectionId, imageId);
        storage.delete(img.getStoragePath());
        imageRepo.delete(img);
    }

    // If other parts still rely on non-user aware list, keep this:
    @Transactional(readOnly = true)
    public List<InspectionImage> list(Long inspectionId, @Nullable ImageType type) {
        return (type == null)
                ? imageRepo.findAllWithAnomalies(inspectionId)
                : imageRepo.findAllWithAnomaliesByType(inspectionId, type);
    }

    @Transactional
    public InspectionImage replaceAnomalies(
            Long userId, Long inspectionId, Long imageId,
            List<AnomalyUpsertDto> incoming) throws IOException {
    
        var img = imageRepo.findByIdAndInspection_UserId(imageId, userId)
                .filter(i -> i.getInspection().getInspectionNo().equals(inspectionId))
                .orElseThrow(() -> new IOException("Image not found"));
    
        // Load existing anomalies and index by id
        var existing = anomalyRepo.findByInspectionImage_Id(img.getId());
        var byId = existing.stream()
                .collect(java.util.stream.Collectors.toMap(InspectionImageAnomaly::getId, a -> a));
    
        var keepIds = new java.util.HashSet<Long>();
    
        if (incoming != null) {
            for (var dto : incoming) {
                if (dto.id() == null) {
                    // New anomaly
                    var a = new InspectionImageAnomaly();
                    a.setInspectionImage(img);
                    a.setX(dto.x()); a.setY(dto.y());
                    a.setWidth(dto.width()); a.setHeight(dto.height());
                    a.setLabel(dto.label());
                    a.setScore(dto.score()); a.setSize(dto.size());
                    a.setComment(dto.comment());
                    a.setOrigin(dto.origin() != null ? dto.origin() : AnomalyType.AI_GENERATED);
                    a.setLastEditedBy(userId); // @PrePersist sets lastEditedAt
                    anomalyRepo.save(a);
                    keepIds.add(a.getId());
                } else {
                    var a = byId.get(dto.id());
                    if (a == null) {
                        // Unknown id -> treat as add (safety)
                        var n = new InspectionImageAnomaly();
                        n.setInspectionImage(img);
                        n.setX(dto.x()); n.setY(dto.y());
                        n.setWidth(dto.width()); n.setHeight(dto.height());
                        n.setLabel(dto.label());
                        n.setScore(dto.score()); n.setSize(dto.size());
                        n.setComment(dto.comment());
                        n.setOrigin(dto.origin() != null ? dto.origin() : AnomalyType.AI_GENERATED);
                        n.setLastEditedBy(userId);
                        anomalyRepo.save(n);
                        keepIds.add(n.getId());
                    } else {
                        // Detect changes
                        boolean changed =
                                a.getX()      != dto.x() ||
                                a.getY()      != dto.y() ||
                                a.getWidth()  != dto.width() ||
                                a.getHeight() != dto.height() ||
                                !java.util.Objects.equals(a.getLabel(), dto.label()) ||
                                !java.util.Objects.equals(a.getScore(), dto.score()) ||
                                !java.util.Objects.equals(a.getSize(), dto.size()) ||
                                !java.util.Objects.equals(a.getComment(), dto.comment()) ||
                                (dto.origin() != null && a.getOrigin() != dto.origin());
    
                        // Apply changes (only if needed)
                        if (changed) {
                            a.setX(dto.x()); a.setY(dto.y());
                            a.setWidth(dto.width()); a.setHeight(dto.height());
                            a.setLabel(dto.label());
                            a.setScore(dto.score()); a.setSize(dto.size());
                            a.setComment(dto.comment());
                            if (dto.origin() != null) {
                                a.setOrigin(dto.origin());
                            }
                            a.setLastEditedBy(userId); // @PreUpdate sets lastEditedAt
                            anomalyRepo.save(a);
                        }
                        keepIds.add(a.getId());
                    }
                }
            }
        }
    
        // Delete the ones removed by the client
        for (var a : existing) {
            if (!keepIds.contains(a.getId())) {
                anomalyRepo.delete(a);
            }
        }

        var finalAnnotations = anomalyRepo.findByInspectionImage_Id(img.getId());
        pythonTrainingService.bufferSample(
                img.getId(),
                img.getStoragePath(),   // or use getFilePath() if available
                finalAnnotations
        );
    
        return imageRepo.findOneWithAnomalies(img.getId()).orElse(img);
    }

    @Transactional
    public void deleteAnomaly(Long userId, Long inspectionId, Long imageId, Long anomalyId) throws IOException {
        // verify the image belongs to this user & inspection
        var img = imageRepo.findByIdAndInspection_UserId(imageId, userId)
                .filter(i -> i.getInspection().getInspectionNo().equals(inspectionId))
                .orElseThrow(() -> new IOException("Image not found"));

        // verify the anomaly belongs to that image
        var anomaly = anomalyRepo.findById(anomalyId)
                .filter(a -> a.getInspectionImage().getId().equals(img.getId()))
                .orElseThrow(() -> new IOException("Anomaly not found"));

        anomalyRepo.delete(anomaly);
    }
}
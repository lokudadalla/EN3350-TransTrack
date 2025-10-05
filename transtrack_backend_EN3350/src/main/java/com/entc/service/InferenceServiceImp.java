package com.entc.service;

import com.entc.dao.ImageType;
import com.entc.dao.InspectionDetails;
import com.entc.dao.InspectionImage;
import com.entc.dao.InspectionImageAnomaly;
import com.entc.dto.InferRequestUrl;      // <- record with (maintenance_image_path, baseline_image_path, temperature_percent)
import com.entc.dto.InferResponse;
import com.entc.repository.InspectionImageAnomalyRepository;
import com.entc.repository.InspectionImageRepository;
import com.entc.repository.InspectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
public class InferenceServiceImp implements InferenceService {

    private final InspectionRepository inspectionRepo;
    private final InspectionImageRepository imageRepo;
    private final InspectionImageAnomalyRepository anomalyRepo;
    private final WebClient pythonClient;

    @Value("${app.server.public-base:http://localhost:8080}")
    private String publicBase;

    private String fileUrl(Long inspectionId, Long imageId) {
        return "%s/inspections/%d/images/%d/file".formatted(publicBase, inspectionId, imageId);
    }

    @Override
    @Transactional
    public InspectionImage runForMaintenance(Long userId, Long inspectionId, Long maintenanceImageId) {
        // 1) Check ownership & existence
        InspectionDetails inspection = inspectionRepo.findByInspectionNoAndUserId(inspectionId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Inspection not found or not owned"));

        InspectionImage maint = imageRepo.findByIdAndInspection_UserId(maintenanceImageId, userId)
                .filter(i -> i.getInspection().getInspectionNo().equals(inspectionId))
                .orElseThrow(() -> new IllegalArgumentException("Maintenance image not found"));

        if (maint.getType() != ImageType.MAINTENANCE) {
            throw new IllegalArgumentException("Inference only supported for MAINTENANCE images");
        }

        // 2) Find baseline for the SAME inspection
        InspectionImage baseline = imageRepo
                .findTopByInspection_InspectionNoAndTypeOrderByUploadedAtDesc(inspectionId, ImageType.BASELINE)
                .orElseThrow(() -> new IllegalStateException("No BASELINE image found for this inspection"));

        // 3) Threshold is required
        Double threshold = inspection.getInferenceThreshold();
        if (threshold == null) {
            throw new IllegalStateException("inferenceThreshold not set for inspection " + inspectionId);
        }
        int tempPercent = (int) Math.round(threshold * 100.0);

        // 4) Build URL-mode request that matches FastAPI
        String maintenancePath = maint.getStoragePath();
        String baselinePath    = baseline.getStoragePath();

        InferRequestUrl req = new InferRequestUrl(
                maintenancePath,
                baselinePath,
                (int) Math.round(threshold * 100.0)   // e.g., 0.7 → 70%
        );

        InferResponse resp = pythonClient.post()
            .uri("/infer")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(req)
            .retrieve()
            .onStatus(
                s -> s.is4xxClientError() || s.is5xxServerError(),
                r -> r.bodyToMono(String.class)
                    .map(msg -> new RuntimeException("AI /infer failed: " + r.statusCode() + " - " + msg))
            )
            .bodyToMono(InferResponse.class)
            .block();

        // 6) Replace anomalies for this maintenance image
        anomalyRepo.deleteByInspectionImage_Id(maint.getId());
        if (resp != null && resp.boxes() != null) {
            var toSave = resp.boxes().stream().map(b -> {
                var a = new InspectionImageAnomaly();
                a.setInspectionImage(maint);
                a.setX(b.x());
                a.setY(b.y());
                a.setWidth(b.width());
                a.setHeight(b.height());
                a.setLabel(b.label());
                a.setScore(b.score());
                a.setSize(b.size());
                return a;
            }).toList();
            anomalyRepo.saveAll(toSave);
        }

        // 7) Return maintenance image with anomalies for DTO
        return imageRepo.findOneWithAnomalies(maint.getId()).orElse(maint);
    }
}
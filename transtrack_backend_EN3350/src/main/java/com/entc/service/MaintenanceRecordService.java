package com.entc.service;

import com.entc.dao.*;
import com.entc.dto.InspectionImageDto;
import com.entc.dto.MaintenanceRecordDto;
import com.entc.dto.MaintenanceRecordUpdateRequest;
import com.entc.repository.InspectionImageRepository;
import com.entc.repository.InspectionRepository;
import com.entc.repository.MaintenanceRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
@RequiredArgsConstructor
public class MaintenanceRecordService {

    private final MaintenanceRecordRepository recordRepo;
    private final InspectionRepository inspectionRepo;
    private final InspectionImageRepository imageRepo;
    private final ObjectMapper mapper = new ObjectMapper();

    @Transactional
    public MaintenanceRecordDto createFromInspection(Long userId, Long inspectionId) {
        recordRepo.findByInspection_InspectionNoAndInspection_UserId(inspectionId, userId)
                .ifPresent(r -> { throw new RuntimeException("Record already exists for this inspection"); });

        var inspection = inspectionRepo.findByInspectionNoAndUserId(inspectionId, userId)
                .orElseThrow(() -> new RuntimeException("Inspection not found or not owned by user"));

        // Grab latest maintenance image (with anomalies)
        var maintImages = imageRepo.findAllWithAnomaliesByTypeForUser(inspectionId, userId, ImageType.MAINTENANCE);
        if (maintImages.isEmpty()) {
            throw new RuntimeException("A maintenance image is required before generating a record");
        }
        var maint = maintImages.get(0); // ordered desc by uploadedAt

        List<InspectionImageDto.AnomalyDto> anomalyDtos = new ArrayList<>();
        // User annotations
        if (maint.getAnomalies() != null) {
            for (var a : maint.getAnomalies()) {
                anomalyDtos.add(new InspectionImageDto.AnomalyDto(
                        a.getId(),
                        a.getX(), a.getY(), a.getWidth(), a.getHeight(),
                        a.getLabel(), a.getScore(), a.getSize(),
                        a.getComment(),
                        a.getOrigin() == null ? null : a.getOrigin().name(),
                        a.getLastEditedAt() == null ? null : a.getLastEditedAt().toString(),
                        a.getLastEditedBy()
                ));
            }
        }
        // AI annotations snapshot
        try {
            if (maint.getAiAnomaliesJson() != null && !maint.getAiAnomaliesJson().isBlank()) {
                List<InspectionImageDto.AnomalyDto> ai = mapper.readValue(
                        maint.getAiAnomaliesJson(),
                        new TypeReference<List<InspectionImageDto.AnomalyDto>>() {}
                );
                anomalyDtos.addAll(ai);
            }
        } catch (Exception ignored) {}

        var record = new MaintenanceRecord();
        record.setInspection(inspection);
        record.setTransformerNo(inspection.getTransformerNo());
        record.setRecordDate(inspection.getInspectionDate());
        record.setStatus(MaintenanceStatus.NEEDS_MAINTENANCE);
        record.setMaintenanceImageId(maint.getId());
        record.setMaintenanceImageUrl("/inspections/%d/images/%d/file".formatted(inspectionId, maint.getId()));

        try {
            record.setAnomaliesSnapshot(mapper.writeValueAsString(anomalyDtos));
        } catch (Exception e) {
            record.setAnomaliesSnapshot("[]");
        }

        var saved = recordRepo.save(record);
        return MaintenanceRecordDto.from(saved);
    }

    @Transactional(readOnly = true)
    public MaintenanceRecordDto getForInspection(Long userId, Long inspectionId) {
        var record = recordRepo.findByInspection_InspectionNoAndInspection_UserId(inspectionId, userId)
                .orElseThrow(() -> new RuntimeException("Record not found"));
        return MaintenanceRecordDto.from(record);
    }

    @Transactional(readOnly = true)
    public List<MaintenanceRecordDto> listForTransformer(Long userId, String transformerNo) {
        return recordRepo.findByInspection_TransformerNoAndInspection_UserIdOrderByCreatedAtDesc(transformerNo, userId)
                .stream().map(MaintenanceRecordDto::from).toList();
    }

    @Transactional
    public MaintenanceRecordDto update(Long userId, Long recordId, MaintenanceRecordUpdateRequest req) {
        var record = recordRepo.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Record not found"));
        if (!record.getInspection().getUserId().equals(userId)) {
            throw new RuntimeException("Forbidden");
        }

        if (req.getInspectorName() != null) {
            record.setInspectorName(req.getInspectorName());
        }
        if (req.getStatus() != null) {
            record.setStatus(req.getStatus());
        }
        Map<String, String> readings = new HashMap<>();
        try {
            if (record.getElectricalReadingsJson() != null && !record.getElectricalReadingsJson().isBlank()) {
                readings.putAll(
                        mapper.readValue(
                                record.getElectricalReadingsJson(),
                                mapper.getTypeFactory().constructMapType(Map.class, String.class, String.class)
                        )
                );
            }
        } catch (Exception ignored) {}

        if (req.getVoltage() != null) readings.put("voltage", req.getVoltage());
        if (req.getCurrent() != null) readings.put("current", req.getCurrent());
        try {
            record.setElectricalReadingsJson(mapper.writeValueAsString(readings));
        } catch (Exception ignored) {}

        if (req.getRecommendedAction() != null) {
            record.setRecommendedAction(req.getRecommendedAction());
        }
        if (req.getRemarks() != null) {
            record.setRemarks(req.getRemarks());
        }
        if (req.getRecordDate() != null && !req.getRecordDate().isBlank()) {
            record.setRecordDate(LocalDate.parse(req.getRecordDate()));
        }
        if (req.isFinalizeRecord() && record.getFinalizedAt() == null) {
            record.setFinalizedAt(LocalDateTime.now());
        }
        var saved = recordRepo.save(record);
        return MaintenanceRecordDto.from(saved);
    }
}

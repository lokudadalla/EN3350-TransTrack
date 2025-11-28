package com.entc.dto;

import com.entc.dao.MaintenanceRecord;
import com.entc.dao.MaintenanceStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceRecordDto {
    private Long id;
    private Long inspectionNo;
    private String transformerNo;
    private String branch;
    private LocalDate inspectionDate;
    private String inspectionTime;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime finalizedAt;
    private LocalDate recordDate;
    private Integer version;

    private String inspectorName;
    private MaintenanceStatus status;
    private Map<String, String> electricalReadings;
    private String recommendedAction;
    private String remarks;

    private Long maintenanceImageId;
    private String maintenanceImageUrl;
    private List<InspectionImageDto.AnomalyDto> anomalies;

    public static MaintenanceRecordDto from(MaintenanceRecord entity) {
        ObjectMapper mapper = new ObjectMapper();

        Map<String, String> readings = Collections.emptyMap();
        try {
            if (entity.getElectricalReadingsJson() != null && !entity.getElectricalReadingsJson().isBlank()) {
                readings = mapper.readValue(
                        entity.getElectricalReadingsJson(),
                        mapper.getTypeFactory().constructMapType(Map.class, String.class, String.class)
                );
            }
        } catch (Exception ignored) {}

        List<InspectionImageDto.AnomalyDto> anomalyDtos = List.of();
        try {
            if (entity.getAnomaliesSnapshot() != null && !entity.getAnomaliesSnapshot().isBlank()) {
                anomalyDtos = mapper.readValue(
                        entity.getAnomaliesSnapshot(),
                        mapper.getTypeFactory().constructCollectionType(List.class, InspectionImageDto.AnomalyDto.class)
                );
            }
        } catch (Exception ignored) {}

        return new MaintenanceRecordDto(
                entity.getId(),
                entity.getInspection().getInspectionNo(),
                entity.getTransformerNo(),
                entity.getInspection().getBranch(),
                entity.getInspection().getInspectionDate(),
                entity.getInspection().getInspectionTime() == null ? null : entity.getInspection().getInspectionTime().toString(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getFinalizedAt(),
                entity.getRecordDate(),
                entity.getVersion(),
                entity.getInspectorName(),
                entity.getStatus(),
                readings,
                entity.getRecommendedAction(),
                entity.getRemarks(),
                entity.getMaintenanceImageId(),
                entity.getMaintenanceImageUrl(),
                anomalyDtos
        );
    }
}

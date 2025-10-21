package com.entc.dto;

import com.entc.dao.EnvironmentCondition;
import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InspectionImageDto {
    private Long id;
    private ImageType type;
    private String fileName;
    private String contentType;
    private long size;
    private LocalDateTime uploadedAt;
    private String url;
    private String uploader;
    private EnvironmentCondition condition;
    private List<AnomalyDto> anomalies;
    private List<AnomalyDto> aiAnomalies;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AnomalyDto {
        private Long id;
        private int x, y, width, height;
        private String label;
        private Double score;
        private Double size;
        private String comment;      // nullable
        private String origin;       // "AI_GENERATED" / "ADDED" / "EDITED" (nullable)
        private String lastEditedAt; // ISO string for UI (nullable)
        private Long   lastEditedBy;
    }

    public static InspectionImageDto from(InspectionImage i) {
        String url = "/inspections/%d/images/%d/file"
                .formatted(i.getInspection().getInspectionNo(), i.getId());

        List<AnomalyDto> anomalyDtos = (i.getAnomalies() == null ? List.<AnomalyDto>of()
                : i.getAnomalies().stream()
                    .map(a -> new AnomalyDto(
                        a.getId(),
                        a.getX(), a.getY(), a.getWidth(), a.getHeight(),
                        a.getLabel(), a.getScore(), a.getSize(),
                        a.getComment(),
                        a.getOrigin() == null ? null : a.getOrigin().name(),
                        a.getLastEditedAt() == null ? null : a.getLastEditedAt().toString(),
                        a.getLastEditedBy()
                    ))
                    .toList());
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        List<AnomalyDto> aiSnap = List.of();
        try {
            if (i.getAiAnomaliesJson() != null && !i.getAiAnomaliesJson().isBlank()) {
                System.out.println("Parsing AI anomalies JSON: " + i.getAiAnomaliesJson());
                aiSnap = mapper.readValue(
                    i.getAiAnomaliesJson(),
                    mapper.getTypeFactory().constructCollectionType(List.class, AnomalyDto.class)
                );
            }
        } catch (Exception e) {
            // optional: log and keep empty
        }
        return new InspectionImageDto(
                i.getId(),
                i.getType(),
                i.getFileName(),
                i.getContentType(),
                i.getSize(),
                i.getUploadedAt(),
                url,
                i.getUploader(),
                i.getCondition(),
                anomalyDtos,
                aiSnap  
        );
    }
}
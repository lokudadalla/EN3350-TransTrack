package com.entc.dto;

import com.entc.dao.EnvironmentCondition;
import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
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

    @Data
    @AllArgsConstructor
    public static class AnomalyDto {
        private Long id;
        private int x, y, width, height;
        private String label;
        private Double score;
        private Double size;
    }

    public static InspectionImageDto from(InspectionImage i) {
        String url = "/inspections/%d/images/%d/file"
                .formatted(i.getInspection().getInspectionNo(), i.getId());

        List<AnomalyDto> anomalyDtos = (i.getAnomalies() == null ? List.of()
                : i.getAnomalies().stream()
                    .map(a -> new AnomalyDto(
                            a.getId(),
                            a.getX(), a.getY(), a.getWidth(), a.getHeight(),
                            a.getLabel(), a.getScore(), a.getSize()))
                    .toList());

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
                anomalyDtos
        );
    }
}
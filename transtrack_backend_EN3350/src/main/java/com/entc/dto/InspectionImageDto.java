package com.entc.dto;

import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

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

    public static InspectionImageDto from(InspectionImage i) {
        String url = "/inspections/%d/images/%d/file".formatted(i.getInspection().getInspectionNo(), i.getId());
        return new InspectionImageDto(i.getId(), i.getType(), i.getFileName(), i.getContentType(), i.getSize(), i.getUploadedAt(), url);
    }
}

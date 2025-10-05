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

    // NEW: embed anomalies
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

        List<AnomalyDto> anomalyDtos =
                (i.getAnomalies() == null ? List.of()
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

    public InspectionImageDto(Long id, ImageType type, String fileName,
            String contentType, long size, LocalDateTime uploadedAt,
            String url, String uploader, EnvironmentCondition condition) {
			this.id = id;
			this.type = type;
			this.fileName = fileName;
			this.contentType = contentType;
			this.size = size;
			this.uploadedAt = uploadedAt;
			this.url = url;
			this.uploader = uploader;
			this.condition = condition;
			}

	public EnvironmentCondition getCondition() {
		return condition;
	}

	public void setCondition(EnvironmentCondition condition) {
		this.condition = condition;
	}

	public String getUploader() {
		return uploader;
	}

	public void setUploader(String uploader) {
		this.uploader = uploader;
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public ImageType getType() {
		return type;
	}

	public void setType(ImageType type) {
		this.type = type;
	}

	public String getFileName() {
		return fileName;
	}

	public void setFileName(String fileName) {
		this.fileName = fileName;
	}

	public String getContentType() {
		return contentType;
	}

	public void setContentType(String contentType) {
		this.contentType = contentType;
	}

	public long getSize() {
		return size;
	}

	public void setSize(long size) {
		this.size = size;
	}

	public LocalDateTime getUploadedAt() {
		return uploadedAt;
	}

	public void setUploadedAt(LocalDateTime uploadedAt) {
		this.uploadedAt = uploadedAt;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}
}

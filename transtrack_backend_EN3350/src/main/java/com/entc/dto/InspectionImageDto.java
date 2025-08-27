package com.entc.dto;

import com.entc.dao.EnvironmentCondition;
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
    private String uploader;
    private EnvironmentCondition condition;

    public static InspectionImageDto from(InspectionImage i) {
        String url = "/inspections/%d/images/%d/file".formatted(i.getInspection().getInspectionNo(), i.getId());
        return new InspectionImageDto(i.getId(), i.getType(), i.getFileName(), i.getContentType(), i.getSize(), i.getUploadedAt(), url, i.getUploader(), i.getCondition());
    }

	public InspectionImageDto() {
		super();
		// TODO Auto-generated constructor stub
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

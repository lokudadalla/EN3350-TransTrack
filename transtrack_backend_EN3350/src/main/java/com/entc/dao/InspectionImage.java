package com.entc.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "inspection_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InspectionImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inspection_no")
    private InspectionDetails inspection;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ImageType type;

    @Column(nullable = false)
    private String fileName;     // original name

    @Column(nullable = false)
    private String storagePath;  // absolute or relative disk path

    @Column(name = "uploaded_by", nullable = false, length = 100)
    private String uploader;

    @Enumerated(EnumType.STRING)
    @Column(name = "env_condition")              // nullable for MAINTENANCE rows
    private EnvironmentCondition condition;

    @Column(nullable = false)
    private String contentType;  // image/jpeg, image/png

    @Column(nullable = false)
    private long size;

    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

<<<<<<< HEAD
=======
    // NEW: link to anomalies (one image → many anomalies)
    @OneToMany(mappedBy = "inspectionImage",
               fetch = FetchType.LAZY,
               cascade = CascadeType.ALL,
               orphanRemoval = true)
    private List<InspectionImageAnomaly> anomalies = new ArrayList<>();
>>>>>>> sasindu_frontend
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public InspectionDetails getInspection() {
		return inspection;
	}

	public void setInspection(InspectionDetails inspection) {
		this.inspection = inspection;
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

	public String getStoragePath() {
		return storagePath;
	}

	public void setStoragePath(String storagePath) {
		this.storagePath = storagePath;
	}

	public String getUploader() {
		return uploader;
	}

	public void setUploader(String uploader) {
		this.uploader = uploader;
	}

	public EnvironmentCondition getCondition() {
		return condition;
	}

	public void setCondition(EnvironmentCondition condition) {
		this.condition = condition;
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
}


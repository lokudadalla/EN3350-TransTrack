package com.entc.dao;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "inspections")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InspectionDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long inspectionNo;

    @Column(name = "transformer_no")
    private String transformerNo;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "branch")
    private String branch;

    @Column(name = "status")
    private String status;

    @Schema(type = "string", format = "date", example = "2025-08-23")
    @Column(name = "inspection_date")
    private LocalDate inspectionDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
    @Schema(type = "string", example = "09:30:00")
    @Column(name = "inspection_time")
    private LocalTime inspectionTime;

    @Column(name = "maintenance_date")
    private String maintenanceDate = "-";

    //TODO: Add inspected by:

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "inference_threshold")
    private Double inferenceThreshold;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

	public Long getInspectionNo() {
		return inspectionNo;
	}

	public Long getUserId() {
		return userId;
	}

	public void setUserId(Long userId) {
		this.userId = userId;
	}

	public void setInspectionNo(Long inspectionNo) {
		this.inspectionNo = inspectionNo;
	}

	public String getTransformerNo() {
		return transformerNo;
	}

	public void setTransformerNo(String transformerNo) {
		this.transformerNo = transformerNo;
	}

	public String getBranch() {
		return branch;
	}

	public void setBranch(String branch) {
		this.branch = branch;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public LocalDate getInspectionDate() {
		return inspectionDate;
	}

	public void setInspectionDate(LocalDate inspectionDate) {
		this.inspectionDate = inspectionDate;
	}

	public LocalTime getInspectionTime() {
		return inspectionTime;
	}

	public void setInspectionTime(LocalTime inspectionTime) {
		this.inspectionTime = inspectionTime;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public String getMaintenanceDate() {
		return maintenanceDate;
	}

	public void setMaintenanceDate(String maintenanceDate) {
		this.maintenanceDate = maintenanceDate;
	}

	
	
}

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
}

package com.entc.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

package com.entc.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "maintenance_records",
        uniqueConstraints = @UniqueConstraint(columnNames = "inspection_no")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inspection_no", nullable = false)
    private InspectionDetails inspection;

    @Column(name = "transformer_no", nullable = false)
    private String transformerNo;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(name = "record_date")
    private LocalDate recordDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private MaintenanceStatus status = MaintenanceStatus.NEEDS_MAINTENANCE;

    @Column(name = "inspector_name")
    private String inspectorName;

    @Column(name = "recommended_action", columnDefinition = "TEXT")
    private String recommendedAction;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "electrical_readings_json", columnDefinition = "LONGTEXT")
    private String electricalReadingsJson;

    @Column(name = "anomalies_snapshot", columnDefinition = "LONGTEXT")
    private String anomaliesSnapshot;

    @Column(name = "maintenance_image_id")
    private Long maintenanceImageId;

    @Column(name = "maintenance_image_url")
    private String maintenanceImageUrl;

    @Column(name = "version_num")
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (version == null) {
            version = 1;
        } else {
            version = version + 1;
        }
    }
}

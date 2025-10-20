package com.entc.dao;

import jakarta.persistence.*;
import lombok.*;
import com.entc.dao.AnomalyType;
import java.time.LocalDateTime;


@Entity
@Table(name = "inspection_image_anomalies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InspectionImageAnomaly {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK → inspection_images.id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inspection_image_id", nullable = false)
    private InspectionImage inspectionImage;

    @Column(nullable = false) private int x;
    @Column(nullable = false) private int y;
    @Column(nullable = false) private int width;
    @Column(nullable = false) private int height;

    private String label;
    private Double score;

    @Column(name = "size")
    private Double size;

    @Enumerated(EnumType.STRING)
    @Column(name = "anomaly_type", nullable = false)
    private AnomalyType origin = AnomalyType.AI_GENERATED;

    @Column(name = "comment", length = 500)
    private String comment;

    @Column(name = "last_edited_at")
    private LocalDateTime lastEditedAt;

    @Column(name = "last_edited_by")
    private Long lastEditedBy;

    @PrePersist
    void onCreate() { lastEditedAt = LocalDateTime.now(); }

    @PreUpdate
    void onUpdate() { lastEditedAt = LocalDateTime.now(); }
}
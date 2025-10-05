package com.entc.dao;

import jakarta.persistence.*;
import lombok.*;

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
}
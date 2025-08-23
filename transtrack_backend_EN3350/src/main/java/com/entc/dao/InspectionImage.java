package com.entc.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    @Column(nullable = false)
    private String contentType;  // image/jpeg, image/png

    @Column(nullable = false)
    private long size;

    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();
}


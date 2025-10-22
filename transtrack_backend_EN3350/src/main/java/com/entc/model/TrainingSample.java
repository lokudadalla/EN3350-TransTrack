package com.entc.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "training_samples")
public class TrainingSample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long imageId;

    @Column(nullable = false)
    private String imagePath;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String finalAcceptedAnnotationsJson;

    @Column(nullable = false)
    private boolean sent = false;   // included in a batch already

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    // ---------- Getters and Setters ----------
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getImageId() {
        return imageId;
    }

    public void setImageId(Long imageId) {
        this.imageId = imageId;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getFinalAcceptedAnnotationsJson() {
        return finalAcceptedAnnotationsJson;
    }

    public void setFinalAcceptedAnnotationsJson(String finalAcceptedAnnotationsJson) {
        this.finalAcceptedAnnotationsJson = finalAcceptedAnnotationsJson;
    }

    public boolean isSent() {
        return sent;
    }

    public void setSent(boolean sent) {
        this.sent = sent;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
package com.entc.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name="transformers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransformerDetails {
	
	    @Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    private Long id;

	    @Column(name = "transformer_no")
	    private String transformerNo;

	    @Column(name = "pole_no")
	    private String poleNo;
	    
	    @Column(name="region")
	    private String region;
	    
	    @Column(name="type")
	    private String type;

	    @Column(name = "location_details")
	    private String locationDetails;

	    @Column(name="favorite")
	    private Boolean favorite;

	    @Column(name = "created_at")
	    private LocalDateTime createdAt;

	    @PrePersist
	    void prePersist() {
	        if (createdAt == null) createdAt = LocalDateTime.now();
	        if (favorite == null) favorite = false;
	    }

}

package com.entc.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
	name = "transformers",
	uniqueConstraints = @UniqueConstraint(columnNames = {"transformer_no", "user_id"}) // optional but recommended
)
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
	    
	    @Column(name = "user_id", nullable = false)   // <-- NEW
	    private Long userId;     

	    @PrePersist
	    void prePersist() {
	        if (createdAt == null) createdAt = LocalDateTime.now();
	        if (favorite == null) favorite = false;
	    }

		public Long getId() {
			return id;
		}

		public void setId(Long id) {
			this.id = id;
		}

		public String getTransformerNo() {
			return transformerNo;
		}

		public void setTransformerNo(String transformerNo) {
			this.transformerNo = transformerNo;
		}

		public String getPoleNo() {
			return poleNo;
		}

		public void setPoleNo(String poleNo) {
			this.poleNo = poleNo;
		}

		public String getRegion() {
			return region;
		}

		public void setRegion(String region) {
			this.region = region;
		}

		public String getType() {
			return type;
		}

		public void setType(String type) {
			this.type = type;
		}

		public String getLocationDetails() {
			return locationDetails;
		}

		public void setLocationDetails(String locationDetails) {
			this.locationDetails = locationDetails;
		}

		public Boolean getFavorite() {
			return favorite;
		}

		public void setFavorite(Boolean favorite) {
			this.favorite = favorite;
		}

		public LocalDateTime getCreatedAt() {
			return createdAt;
		}

		public void setCreatedAt(LocalDateTime createdAt) {
			this.createdAt = createdAt;
		}

		public Long getUserId() {
			return userId;
		}

		public void setUserId(Long userId) {
			this.userId = userId;
		}

		
}

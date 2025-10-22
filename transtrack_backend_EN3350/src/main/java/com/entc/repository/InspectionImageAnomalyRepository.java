package com.entc.repository;

import com.entc.dao.InspectionImageAnomaly;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InspectionImageAnomalyRepository extends JpaRepository<InspectionImageAnomaly, Long> {
    List<InspectionImageAnomaly> findByInspectionImage_Id(Long inspectionImageId);
    void deleteByInspectionImage_Id(Long inspectionImageId); // add this
    
    @Modifying
    @Query("delete from InspectionImageAnomaly a where a.inspectionImage.id in :imageIds")
    void deleteAllByImageIds(@Param("imageIds") List<Long> imageIds);
}
package com.entc.repository;

import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InspectionImageRepository extends JpaRepository<InspectionImage, Long> {
    // existing
    List<InspectionImage> findByInspection_InspectionNo(Long inspectionNo);
    List<InspectionImage> findByInspection_InspectionNoAndType(Long inspectionNo, ImageType type);

    // NEW: fetch images + anomalies (for Option B)
    @Query("""
           select distinct i
           from InspectionImage i
           left join fetch i.anomalies a
           where i.inspection.inspectionNo = :inspectionNo
           """)
    List<InspectionImage> findAllWithAnomalies(@Param("inspectionNo") Long inspectionNo);

    @Query("""
           select distinct i
           from InspectionImage i
           left join fetch i.anomalies a
           where i.inspection.inspectionNo = :inspectionNo and i.type = :type
           """)
    List<InspectionImage> findAllWithAnomaliesByType(@Param("inspectionNo") Long inspectionNo,
                                                     @Param("type") ImageType type);
}
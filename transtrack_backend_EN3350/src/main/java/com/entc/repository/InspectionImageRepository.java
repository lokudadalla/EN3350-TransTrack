package com.entc.repository;

import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InspectionImageRepository extends JpaRepository<InspectionImage, Long> {

    // ---------- Basic finders (no user filter; keep if used elsewhere) ----------
    List<InspectionImage> findByInspection_InspectionNo(Long inspectionNo);
    List<InspectionImage> findByInspection_InspectionNoAndType(Long inspectionNo, ImageType type);

    // ---------- Fetch images + anomalies (no user filter; used by old code/tests) ----------
    @Query("""
           select distinct i
           from InspectionImage i
           left join fetch i.anomalies a
           where i.inspection.inspectionNo = :inspectionNo
           order by i.uploadedAt desc
           """)
    List<InspectionImage> findAllWithAnomalies(@Param("inspectionNo") Long inspectionNo);

    @Query("""
           select distinct i
           from InspectionImage i
           left join fetch i.anomalies a
           where i.inspection.inspectionNo = :inspectionNo and i.type = :type
           order by i.uploadedAt desc
           """)
    List<InspectionImage> findAllWithAnomaliesByType(@Param("inspectionNo") Long inspectionNo,
                                                     @Param("type") ImageType type);

    // ---------- User-scoped fetch-join (recommended for your controller) ----------
    @Query("""
           select distinct i
           from InspectionImage i
           left join fetch i.anomalies a
           where i.inspection.inspectionNo = :inspectionNo
             and i.inspection.userId = :userId
           order by i.uploadedAt desc
           """)
    List<InspectionImage> findAllWithAnomaliesForUser(@Param("inspectionNo") Long inspectionNo,
                                                      @Param("userId") Long userId);

    @Query("""
           select distinct i
           from InspectionImage i
           left join fetch i.anomalies a
           where i.inspection.inspectionNo = :inspectionNo
             and i.inspection.userId = :userId
             and i.type = :type
           order by i.uploadedAt desc
           """)
    List<InspectionImage> findAllWithAnomaliesByTypeForUser(@Param("inspectionNo") Long inspectionNo,
                                                            @Param("userId") Long userId,
                                                            @Param("type") ImageType type);

    // ---------- User-scoped helpers ----------
    List<InspectionImage> findByInspection_InspectionNoAndInspection_UserId(Long inspectionNo, Long userId);

    List<InspectionImage> findByInspection_InspectionNoAndInspection_UserIdAndType(
        Long inspectionNo, Long userId, ImageType type);

    Optional<InspectionImage> findByIdAndInspection_UserId(Long id, Long userId);

    // Fetch one image with anomalies (useful after saving anomalies)
    @Query("""
           select i
           from InspectionImage i
           left join fetch i.anomalies a
           where i.id = :id
           """)
    Optional<InspectionImage> findOneWithAnomalies(@Param("id") Long id);
}

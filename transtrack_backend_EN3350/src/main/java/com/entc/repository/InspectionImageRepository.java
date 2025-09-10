package com.entc.repository;

import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InspectionImageRepository extends JpaRepository<InspectionImage, Long> {

    // list for THIS inspection but only if it belongs to THIS user
    List<InspectionImage> findByInspection_InspectionNoAndInspection_UserId(Long inspectionNo, Long userId);

    List<InspectionImage> findByInspection_InspectionNoAndInspection_UserIdAndType(
        Long inspectionNo, Long userId, ImageType type);

    Optional<InspectionImage> findByIdAndInspection_UserId(Long id, Long userId);
}

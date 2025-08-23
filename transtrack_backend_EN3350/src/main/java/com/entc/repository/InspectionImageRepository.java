package com.entc.repository;

import com.entc.dao.ImageType;
import com.entc.dao.InspectionImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InspectionImageRepository extends JpaRepository<InspectionImage, Long> {
    List<InspectionImage> findByInspection_InspectionNo(Long inspectionNo);
    List<InspectionImage> findByInspection_InspectionNoAndType(Long inspectionNo, ImageType type);
}
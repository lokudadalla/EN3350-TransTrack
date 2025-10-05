package com.entc.repository;

import com.entc.dao.InspectionImageAnomaly;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InspectionImageAnomalyRepository extends JpaRepository<InspectionImageAnomaly, Long> {
    List<InspectionImageAnomaly> findByInspectionImage_Id(Long inspectionImageId);
    void deleteByInspectionImage_Id(Long inspectionImageId); // 👈 add this
}
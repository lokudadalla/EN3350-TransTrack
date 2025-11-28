package com.entc.repository;

import com.entc.dao.MaintenanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MaintenanceRecordRepository extends JpaRepository<MaintenanceRecord, Long> {
    Optional<MaintenanceRecord> findByInspection_InspectionNoAndInspection_UserId(Long inspectionNo, Long userId);
    List<MaintenanceRecord> findByInspection_TransformerNoAndInspection_UserIdOrderByCreatedAtDesc(String transformerNo, Long userId);
}

package com.entc.repository;

import com.entc.dao.InspectionDetails;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionRepository extends JpaRepository<InspectionDetails, Long> {

    // list for one transformer for THIS user
    List<InspectionDetails> findAllByTransformerNoAndUserId(String transformerNo, Long userId);

    // list all for THIS user
    List<InspectionDetails> findAllByUserId(Long userId);

    // single row by id for THIS user
    Optional<InspectionDetails> findByInspectionNoAndUserId(Long inspectionNo, Long userId);
}


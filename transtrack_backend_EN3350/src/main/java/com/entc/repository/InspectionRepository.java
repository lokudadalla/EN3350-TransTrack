package com.entc.repository;

import com.entc.dao.InspectionDetails;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionRepository extends JpaRepository<InspectionDetails, Long> {
}

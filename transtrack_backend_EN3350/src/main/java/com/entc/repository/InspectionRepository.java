package com.entc.repository;

import com.entc.dao.InspectionDetails;
import com.entc.dao.TransformerDetails;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionRepository extends JpaRepository<InspectionDetails, Long> {

    //find inspection details by using transformer Id
    InspectionDetails findInspectionByTransformerNo(String transformerNo);

}

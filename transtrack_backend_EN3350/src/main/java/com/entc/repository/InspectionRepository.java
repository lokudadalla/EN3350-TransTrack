package com.entc.repository;

import com.entc.dao.InspectionDetails;
import com.entc.dao.TransformerDetails;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionRepository extends JpaRepository<InspectionDetails, Long> {

    //find inspection details by using transformer Id
    List<InspectionDetails> findAllByTransformerNo(String transformerNo);

}

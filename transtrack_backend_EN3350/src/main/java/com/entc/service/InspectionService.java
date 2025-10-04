package com.entc.service;

import com.entc.dao.InspectionDetails;
import com.entc.dao.TransformerDetails;

import java.util.List;

public interface InspectionService {
    List<InspectionDetails> getAllInspections(Long userId);
    InspectionDetails getById(Long userId, Long id);
    InspectionDetails create(Long userId, InspectionDetails toCreate);
    List<InspectionDetails> getAllInspectionByTransformerNo(Long userId, String transformerNo);
    InspectionDetails update(Long userId, Long id, InspectionDetails body);
    void delete(Long userId, Long id);
}

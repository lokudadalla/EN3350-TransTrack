package com.entc.service;

import com.entc.dao.InspectionDetails;

import java.util.List;

public interface InspectionService {
    List<InspectionDetails> getAllInspections();
    InspectionDetails getById(Long id);
    InspectionDetails create(InspectionDetails toCreate);
    InspectionDetails update(Long id, InspectionDetails toUpdate);
    void delete(Long id);
}

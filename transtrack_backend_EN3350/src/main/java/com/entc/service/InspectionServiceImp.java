package com.entc.service;

import com.entc.dao.InspectionDetails;
import com.entc.repository.InspectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class InspectionServiceImp implements InspectionService {

    private final InspectionRepository inspectionRepository;

    @Autowired
    public InspectionServiceImp(InspectionRepository inspectionRepository) {
        this.inspectionRepository = inspectionRepository;
    }

    @Override
    public List<InspectionDetails> getAllInspections() {
        return inspectionRepository.findAll(); // temporary placeholder
    }
}

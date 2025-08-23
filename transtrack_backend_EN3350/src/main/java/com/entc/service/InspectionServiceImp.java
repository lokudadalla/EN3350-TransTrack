package com.entc.service;

import com.entc.dao.InspectionDetails;
import com.entc.dao.TransformerDetails;
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

    @Override
    public InspectionDetails getById(Long id) {
        return inspectionRepository.findById(id).orElseThrow(()-> new RuntimeException("Transfomer not found for the Transfomer No."+ id));
    }

    @Override
    public InspectionDetails create(InspectionDetails toCreate) {
        // Ensure client cannot force an ID
        toCreate.setInspectionNo(null);
        return inspectionRepository.save(toCreate);
    }

    @Override
    public List<InspectionDetails> getAllInspectionByTransformerNo(String transformerNo) {

        List<InspectionDetails> inspectionT = inspectionRepository.findAllByTransformerNo(transformerNo);
        if (inspectionT == null) throw new RuntimeException("Inspections not found for the Transformer No: " + transformerNo);
        return inspectionT;
    }

    @Override
    public InspectionDetails update(Long id, InspectionDetails body) {
        return inspectionRepository.findById(id).map(existing -> {
            if (body.getTransformerNo() != null) {
                existing.setTransformerNo(body.getTransformerNo());
            }
            if (body.getBranch() != null) {
                existing.setBranch(body.getBranch());
            }
            if (body.getStatus() != null) {
                existing.setStatus(body.getStatus());
            }
            if (body.getInspectionTime() != null) {
                existing.setInspectionTime(body.getInspectionTime());
            }
            if (body.getInspectionDate() != null) {
                existing.setInspectionDate(body.getInspectionDate());
            }
            return inspectionRepository.save(existing);
        }).orElse(null);
    }

    @Override
    public void delete(Long id) {

        inspectionRepository.deleteById(id);

    }
}
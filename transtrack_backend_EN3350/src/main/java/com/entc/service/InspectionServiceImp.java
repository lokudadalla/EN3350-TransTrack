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

    public InspectionServiceImp(InspectionRepository inspectionRepository) {
        this.inspectionRepository = inspectionRepository;
    }

    @Override
    public List<InspectionDetails> getAllInspections(Long userId) {
        return inspectionRepository.findAllByUserId(userId);
    }

    @Override
    public InspectionDetails getById(Long userId, Long id) {
        return inspectionRepository.findByInspectionNoAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Inspection not found"));
    }

    @Override
    public InspectionDetails create(Long userId, InspectionDetails toCreate) {
        toCreate.setInspectionNo(null);
        toCreate.setUserId(userId);                 // <-- stamp owner
        if (toCreate.getMaintenanceDate() == null) {
            toCreate.setMaintenanceDate("-");
        }
        return inspectionRepository.save(toCreate);
    }

    @Override
    public List<InspectionDetails> getAllInspectionByTransformerNo(Long userId, String transformerNo) {
        return inspectionRepository.findAllByTransformerNoAndUserId(transformerNo, userId);
    }

    @Override
    public InspectionDetails update(Long userId, Long id, InspectionDetails body) {
        return inspectionRepository.findByInspectionNoAndUserId(id, userId)
                .map(existing -> {
                    if (body.getTransformerNo() != null) existing.setTransformerNo(body.getTransformerNo());
                    if (body.getBranch() != null)        existing.setBranch(body.getBranch());
                    if (body.getStatus() != null)        existing.setStatus(body.getStatus());
                    if (body.getInspectionTime() != null) existing.setInspectionTime(body.getInspectionTime());
                    if (body.getInspectionDate() != null) existing.setInspectionDate(body.getInspectionDate());
                    if (body.getMaintenanceDate() != null) existing.setMaintenanceDate(body.getMaintenanceDate());
                    return inspectionRepository.save(existing);
                })
                .orElse(null);
    }

    @Override
    public void delete(Long userId, Long id) {
        inspectionRepository.findByInspectionNoAndUserId(id, userId)
                .ifPresent(inspectionRepository::delete);
    }
}

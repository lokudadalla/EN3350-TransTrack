package com.entc.service;

import com.entc.dao.InspectionDetails;
import com.entc.repository.InspectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

<<<<<<< HEAD

=======
>>>>>>> sasindu_frontend
@Service
@RequiredArgsConstructor
public class InspectionServiceImp implements InspectionService {

    private final InspectionRepository inspectionRepository;

<<<<<<< HEAD
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
=======
    @Override
    public List<InspectionDetails> getAllInspections(Long userId) {
        return inspectionRepository.findAllByUserId(userId);
    }

    @Override
    public InspectionDetails getById(Long userId, Long id) {
        return inspectionRepository.findByInspectionNoAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Inspection not found or not owned by user"));
    }

    @Override
    public InspectionDetails create(Long userId, InspectionDetails toCreate) {
        // Server-side ownership
        toCreate.setInspectionNo(null);
        toCreate.setUserId(userId);
>>>>>>> sasindu_frontend
        if (toCreate.getMaintenanceDate() == null) {
            toCreate.setMaintenanceDate("-");
        }
        // inferenceThreshold is optional; if provided, we persist as-is
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
<<<<<<< HEAD
                    if (body.getTransformerNo() != null) existing.setTransformerNo(body.getTransformerNo());
                    if (body.getBranch() != null)        existing.setBranch(body.getBranch());
                    if (body.getStatus() != null)        existing.setStatus(body.getStatus());
                    if (body.getInspectionTime() != null) existing.setInspectionTime(body.getInspectionTime());
                    if (body.getInspectionDate() != null) existing.setInspectionDate(body.getInspectionDate());
                    if (body.getMaintenanceDate() != null) existing.setMaintenanceDate(body.getMaintenanceDate());
=======
                    if (body.getTransformerNo() != null)   existing.setTransformerNo(body.getTransformerNo());
                    if (body.getBranch() != null)           existing.setBranch(body.getBranch());
                    if (body.getStatus() != null)           existing.setStatus(body.getStatus());
                    if (body.getInspectionTime() != null)   existing.setInspectionTime(body.getInspectionTime());
                    if (body.getInspectionDate() != null)   existing.setInspectionDate(body.getInspectionDate());
                    if (body.getMaintenanceDate() != null)  existing.setMaintenanceDate(body.getMaintenanceDate());
                    // 🔹 keep threshold updates (0..1 validation can be done in controller if desired)
                    if (body.getInferenceThreshold() != null) {
                        existing.setInferenceThreshold(body.getInferenceThreshold());
                    }
                    // never allow userId changes via update
                    existing.setUserId(userId);
>>>>>>> sasindu_frontend
                    return inspectionRepository.save(existing);
                })
                .orElse(null);
    }

    @Override
    public void delete(Long userId, Long id) {
<<<<<<< HEAD
        inspectionRepository.findByInspectionNoAndUserId(id, userId)
                .ifPresent(inspectionRepository::delete);
=======
        var existing = inspectionRepository.findByInspectionNoAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Inspection not found or not owned by user"));
        inspectionRepository.delete(existing);
>>>>>>> sasindu_frontend
    }
}

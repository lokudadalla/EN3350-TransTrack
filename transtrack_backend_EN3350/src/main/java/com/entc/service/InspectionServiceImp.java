package com.entc.service;

import com.entc.dao.InspectionDetails;
import com.entc.repository.InspectionImageAnomalyRepository;
import com.entc.repository.InspectionImageRepository;
import com.entc.repository.InspectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.List;

@Service
@RequiredArgsConstructor
public class InspectionServiceImp implements InspectionService {

    private final InspectionRepository inspectionRepository;
    private final InspectionImageRepository imageRepository;
    private final InspectionImageAnomalyRepository anomalyRepository;

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
                    return inspectionRepository.save(existing);
                })
                .orElse(null);
    }

    // @Override
    // public void delete(Long userId, Long id) {
    //     var existing = inspectionRepository.findByInspectionNoAndUserId(id, userId)
    //             .orElseThrow(() -> new RuntimeException("Inspection not found or not owned by user"));
    //     inspectionRepository.delete(existing);
    // }

    @Override
    @Transactional
    public void delete(Long userId, Long id) {
    var existing = inspectionRepository.findByInspectionNoAndUserId(id, userId)
        .orElseThrow(() -> new RuntimeException("Inspection not found or not owned by user"));

    //collect image ids
    var imageIds = imageRepository.findIdsByInspection(id);

    //delete anomalies for those images
    if (!imageIds.isEmpty()) {
        anomalyRepository.deleteAllByImageIds(imageIds);
    }

    //delete images for the inspection
    imageRepository.deleteAllByInspection(id);

    //finally delete the inspection
    inspectionRepository.delete(existing);
    }
}

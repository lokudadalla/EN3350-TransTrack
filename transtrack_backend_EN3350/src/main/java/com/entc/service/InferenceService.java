package com.entc.service;

import com.entc.dao.InspectionImage;

public interface InferenceService {
    InspectionImage runForMaintenance(Long userId, Long inspectionId, Long maintenanceImageId);
}
package com.entc.dto;

import com.entc.dao.MaintenanceStatus;
import lombok.Data;

@Data
public class MaintenanceRecordUpdateRequest {
    private String inspectorName;
    private MaintenanceStatus status;
    private String voltage;
    private String current;
    private String recommendedAction;
    private String remarks;
    private String recordDate; // ISO date string
    private boolean finalizeRecord;
}

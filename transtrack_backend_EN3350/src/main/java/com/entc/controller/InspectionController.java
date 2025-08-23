package com.entc.controller;

import com.entc.dao.InspectionDetails;
import com.entc.service.InspectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("inspections")
public class InspectionController {

    @Autowired
    InspectionService inspectionService;

    @GetMapping("inspections")
    List<InspectionDetails> getAllInspections() {
        return inspectionService.getAllInspections();
    }
}

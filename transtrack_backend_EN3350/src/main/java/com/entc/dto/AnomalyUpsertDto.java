package com.entc.dto;

import com.entc.dao.AnomalyType;

public record AnomalyUpsertDto(
        Long id,          // optional: may be null for new boxes
        int x,
        int y,
        int width,
        int height,
        String label,
        Double score,
        Double size,
        String comment,
        AnomalyType origin 
) {}
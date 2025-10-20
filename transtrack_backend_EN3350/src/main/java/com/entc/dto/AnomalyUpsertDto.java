package com.entc.dto;

public record AnomalyUpsertDto(
        Long id,          // optional: may be null for new boxes
        int x,
        int y,
        int width,
        int height,
        String label,
        Double score,
        Double size
) {}
package com.entc.dto;

public record BBox(
        int x, int y, int width, int height,
        String label, Double score, Double size
) {}
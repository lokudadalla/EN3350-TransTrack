package com.entc.dto;

import java.util.List;

public record InferResponse(
        List<BBox> boxes
) {}
package com.entc.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record InferRequestUrl(
    @JsonProperty("maintenance_image_path") String maintenancePath,
    @JsonProperty("baseline_image_path") String baselinePath,
    @JsonProperty("temperature_percent") Integer temperaturePercent
) {}
package com.smartfarm.backend.dto.request;

import com.smartfarm.backend.entity.SensorType;
import jakarta.validation.constraints.NotNull;

public class ThresholdRequest {

    @NotNull(message = "Zone ID không được để trống")
    private Long zoneId;

    @NotNull(message = "Loại cảm biến không được để trống")
    private SensorType sensorType;

    private Double minValue;

    private Double maxValue;

    public ThresholdRequest() {}

    public ThresholdRequest(Long zoneId, SensorType sensorType, Double minValue, Double maxValue) {
        this.zoneId = zoneId;
        this.sensorType = sensorType;
        this.minValue = minValue;
        this.maxValue = maxValue;
    }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public Double getMinValue() { return minValue; }
    public void setMinValue(Double minValue) { this.minValue = minValue; }

    public Double getMaxValue() { return maxValue; }
    public void setMaxValue(Double maxValue) { this.maxValue = maxValue; }
}

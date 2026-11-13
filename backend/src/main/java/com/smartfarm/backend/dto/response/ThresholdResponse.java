package com.smartfarm.backend.dto.response;

import com.smartfarm.backend.entity.SensorType;

import java.time.LocalDateTime;

public class ThresholdResponse {

    private Long id;
    private SensorType sensorType;
    private Double minValue;
    private Double maxValue;
    private Long zoneId;
    private String zoneName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ThresholdResponse() {}

    public ThresholdResponse(Long id, SensorType sensorType, Double minValue, Double maxValue,
                             Long zoneId, String zoneName, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.sensorType = sensorType;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public Double getMinValue() { return minValue; }
    public void setMinValue(Double minValue) { this.minValue = minValue; }

    public Double getMaxValue() { return maxValue; }
    public void setMaxValue(Double maxValue) { this.maxValue = maxValue; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public String getZoneName() { return zoneName; }
    public void setZoneName(String zoneName) { this.zoneName = zoneName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

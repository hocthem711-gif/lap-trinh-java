package com.smartfarm.backend.dto.response;

import java.time.LocalDateTime;

public class ZoneResponse {

    private Long id;
    private String name;
    private String cropType;
    private Long farmId;
    private String farmName;
    private int totalSensors;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ZoneResponse() {}

    public ZoneResponse(Long id, String name, String cropType, Long farmId, String farmName, int totalSensors, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.cropType = cropType;
        this.farmId = farmId;
        this.farmName = farmName;
        this.totalSensors = totalSensors;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCropType() { return cropType; }
    public void setCropType(String cropType) { this.cropType = cropType; }

    public Long getFarmId() { return farmId; }
    public void setFarmId(Long farmId) { this.farmId = farmId; }

    public String getFarmName() { return farmName; }
    public void setFarmName(String farmName) { this.farmName = farmName; }

    public int getTotalSensors() { return totalSensors; }
    public void setTotalSensors(int totalSensors) { this.totalSensors = totalSensors; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

package com.smartfarm.backend.dto.response;

import java.time.LocalDateTime;

public class FarmResponse {

    private Long id;
    private String name;
    private String location;
    private Double areaSquareMeters;
    private Long ownerId;
    private String ownerName;
    private int totalZones;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public FarmResponse() {}

    public FarmResponse(Long id, String name, String location, Double areaSquareMeters, Long ownerId, String ownerName, int totalZones, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.areaSquareMeters = areaSquareMeters;
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.totalZones = totalZones;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Double getAreaSquareMeters() { return areaSquareMeters; }
    public void setAreaSquareMeters(Double areaSquareMeters) { this.areaSquareMeters = areaSquareMeters; }

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public int getTotalZones() { return totalZones; }
    public void setTotalZones(int totalZones) { this.totalZones = totalZones; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

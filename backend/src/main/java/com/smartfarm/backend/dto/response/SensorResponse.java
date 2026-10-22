package com.smartfarm.backend.dto.response;

import com.smartfarm.backend.entity.SensorStatus;
import com.smartfarm.backend.entity.SensorType;

import java.time.LocalDateTime;

public class SensorResponse {

    private Long id;
    private String sensorCode;
    private String name;
    private SensorType sensorType;
    private SensorStatus status;
    private Long zoneId;
    private String zoneName;
    private Long farmId;
    private String farmName;
    private Double latitude;
    private Double longitude;
    private LocalDateTime installedAt;

    public SensorResponse() {}

    public SensorResponse(Long id, String sensorCode, String name, SensorType sensorType, SensorStatus status,
                          Long zoneId, String zoneName, Long farmId, String farmName,
                          Double latitude, Double longitude, LocalDateTime installedAt) {
        this.id = id;
        this.sensorCode = sensorCode;
        this.name = name;
        this.sensorType = sensorType;
        this.status = status;
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.farmId = farmId;
        this.farmName = farmName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.installedAt = installedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSensorCode() { return sensorCode; }
    public void setSensorCode(String sensorCode) { this.sensorCode = sensorCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public SensorStatus getStatus() { return status; }
    public void setStatus(SensorStatus status) { this.status = status; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public String getZoneName() { return zoneName; }
    public void setZoneName(String zoneName) { this.zoneName = zoneName; }

    public Long getFarmId() { return farmId; }
    public void setFarmId(Long farmId) { this.farmId = farmId; }

    public String getFarmName() { return farmName; }
    public void setFarmName(String farmName) { this.farmName = farmName; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public LocalDateTime getInstalledAt() { return installedAt; }
    public void setInstalledAt(LocalDateTime installedAt) { this.installedAt = installedAt; }
}

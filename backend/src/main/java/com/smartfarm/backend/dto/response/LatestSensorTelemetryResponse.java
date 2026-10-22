package com.smartfarm.backend.dto.response;

import com.smartfarm.backend.entity.SensorStatus;
import com.smartfarm.backend.entity.SensorType;
import java.time.LocalDateTime;

public class LatestSensorTelemetryResponse {

    private Long sensorId;
    private String sensorCode;
    private String name;
    private SensorType sensorType;
    private SensorStatus sensorStatus;
    private Long zoneId;
    private String zoneName;
    private Long farmId;
    private String farmName;
    private Double latitude;
    private Double longitude;
    private Double latestValue;
    private String unit;
    private Double batteryLevel;
    private String dataStatus;
    private LocalDateTime lastUpdated;

    public LatestSensorTelemetryResponse() {}

    public LatestSensorTelemetryResponse(Long sensorId, String sensorCode, String name, SensorType sensorType,
                                         SensorStatus sensorStatus, Long zoneId, String zoneName, Long farmId, String farmName,
                                         Double latitude, Double longitude, Double latestValue, String unit,
                                         Double batteryLevel, String dataStatus, LocalDateTime lastUpdated) {
        this.sensorId = sensorId;
        this.sensorCode = sensorCode;
        this.name = name;
        this.sensorType = sensorType;
        this.sensorStatus = sensorStatus;
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.farmId = farmId;
        this.farmName = farmName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.latestValue = latestValue;
        this.unit = unit;
        this.batteryLevel = batteryLevel;
        this.dataStatus = dataStatus;
        this.lastUpdated = lastUpdated;
    }

    public Long getSensorId() { return sensorId; }
    public void setSensorId(Long sensorId) { this.sensorId = sensorId; }

    public String getSensorCode() { return sensorCode; }
    public void setSensorCode(String sensorCode) { this.sensorCode = sensorCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public SensorStatus getSensorStatus() { return sensorStatus; }
    public void setSensorStatus(SensorStatus sensorStatus) { this.sensorStatus = sensorStatus; }

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

    public Double getLatestValue() { return latestValue; }
    public void setLatestValue(Double latestValue) { this.latestValue = latestValue; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Double getBatteryLevel() { return batteryLevel; }
    public void setBatteryLevel(Double batteryLevel) { this.batteryLevel = batteryLevel; }

    public String getDataStatus() { return dataStatus; }
    public void setDataStatus(String dataStatus) { this.dataStatus = dataStatus; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
}

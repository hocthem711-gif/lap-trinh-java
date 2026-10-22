package com.smartfarm.backend.dto.response;

import com.smartfarm.backend.entity.SensorType;
import java.time.LocalDateTime;

public class SensorDataResponse {

    private Long id;
    private Long sensorId;
    private String sensorCode;
    private SensorType sensorType;
    private Long zoneId;
    private String zoneName;
    private Double value;
    private String unit;
    private Double batteryLevel;
    private String status;
    private LocalDateTime recordedAt;

    public SensorDataResponse() {}

    public SensorDataResponse(Long id, Long sensorId, String sensorCode, SensorType sensorType,
                              Long zoneId, String zoneName, Double value, String unit,
                              Double batteryLevel, String status, LocalDateTime recordedAt) {
        this.id = id;
        this.sensorId = sensorId;
        this.sensorCode = sensorCode;
        this.sensorType = sensorType;
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.value = value;
        this.unit = unit;
        this.batteryLevel = batteryLevel;
        this.status = status;
        this.recordedAt = recordedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getSensorId() { return sensorId; }
    public void setSensorId(Long sensorId) { this.sensorId = sensorId; }

    public String getSensorCode() { return sensorCode; }
    public void setSensorCode(String sensorCode) { this.sensorCode = sensorCode; }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public String getZoneName() { return zoneName; }
    public void setZoneName(String zoneName) { this.zoneName = zoneName; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Double getBatteryLevel() { return batteryLevel; }
    public void setBatteryLevel(Double batteryLevel) { this.batteryLevel = batteryLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }
}

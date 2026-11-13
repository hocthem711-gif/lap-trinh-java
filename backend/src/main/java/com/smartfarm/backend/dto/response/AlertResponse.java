package com.smartfarm.backend.dto.response;

import com.smartfarm.backend.entity.AlertLevel;

import java.time.LocalDateTime;

public class AlertResponse {

    private Long id;
    private String message;
    private AlertLevel alertLevel;
    private Boolean isRead;
    private Long zoneId;
    private String zoneName;
    private Long sensorId;
    private String sensorName;
    private LocalDateTime createdAt;

    public AlertResponse() {}

    public AlertResponse(Long id, String message, AlertLevel alertLevel, Boolean isRead,
                         Long zoneId, String zoneName, Long sensorId, String sensorName,
                         LocalDateTime createdAt) {
        this.id = id;
        this.message = message;
        this.alertLevel = alertLevel;
        this.isRead = isRead;
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.sensorId = sensorId;
        this.sensorName = sensorName;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public AlertLevel getAlertLevel() { return alertLevel; }
    public void setAlertLevel(AlertLevel alertLevel) { this.alertLevel = alertLevel; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public String getZoneName() { return zoneName; }
    public void setZoneName(String zoneName) { this.zoneName = zoneName; }

    public Long getSensorId() { return sensorId; }
    public void setSensorId(Long sensorId) { this.sensorId = sensorId; }

    public String getSensorName() { return sensorName; }
    public void setSensorName(String sensorName) { this.sensorName = sensorName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

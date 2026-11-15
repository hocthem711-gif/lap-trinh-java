package com.smartfarm.backend.dto.response;

import com.smartfarm.backend.entity.AlertLevel;
import com.smartfarm.backend.entity.AlertStatus;
import java.time.LocalDateTime;

public class AlertResponse {

    private Long id;
    private String message;
    private AlertLevel alertLevel;
    private Boolean isRead;
    private AlertStatus status;
    private String resolvedNote;
    private LocalDateTime resolvedAt;
    private Long zoneId;
    private String zoneName;
    private Long sensorId;
    private String sensorName;
    private LocalDateTime createdAt;

    public AlertResponse() {}

    public AlertResponse(Long id, String message, AlertLevel alertLevel, Boolean isRead,
                         AlertStatus status, String resolvedNote, LocalDateTime resolvedAt,
                         Long zoneId, String zoneName, Long sensorId, String sensorName,
                         LocalDateTime createdAt) {
        this.id = id;
        this.message = message;
        this.alertLevel = alertLevel;
        this.isRead = isRead;
        this.status = status;
        this.resolvedNote = resolvedNote;
        this.resolvedAt = resolvedAt;
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.sensorId = sensorId;
        this.sensorName = sensorName;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public AlertLevel getAlertLevel() { return alertLevel; }
    public void setAlertLevel(AlertLevel alertLevel) { this.alertLevel = alertLevel; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public AlertStatus getStatus() { return status; }
    public void setStatus(AlertStatus status) { this.status = status; }

    public String getResolvedNote() { return resolvedNote; }
    public void setResolvedNote(String resolvedNote) { this.resolvedNote = resolvedNote; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

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
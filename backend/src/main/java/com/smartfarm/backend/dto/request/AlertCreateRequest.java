package com.smartfarm.backend.dto.request;

import com.smartfarm.backend.entity.AlertLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AlertCreateRequest {

    @NotBlank(message = "Nội dung cảnh báo không được để trống")
    private String message;

    @NotNull(message = "Mức độ cảnh báo không được để trống")
    private AlertLevel alertLevel;

    @NotNull(message = "Zone ID không được để trống")
    private Long zoneId;

    private Long sensorId;

    public AlertCreateRequest() {}

    public AlertCreateRequest(String message, AlertLevel alertLevel, Long zoneId, Long sensorId) {
        this.message = message;
        this.alertLevel = alertLevel;
        this.zoneId = zoneId;
        this.sensorId = sensorId;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public AlertLevel getAlertLevel() { return alertLevel; }
    public void setAlertLevel(AlertLevel alertLevel) { this.alertLevel = alertLevel; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public Long getSensorId() { return sensorId; }
    public void setSensorId(Long sensorId) { this.sensorId = sensorId; }
}

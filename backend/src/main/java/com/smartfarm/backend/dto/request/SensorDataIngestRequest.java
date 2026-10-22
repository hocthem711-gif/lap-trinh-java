package com.smartfarm.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class SensorDataIngestRequest {

    @NotBlank(message = "Mã cảm biến (sensorCode) không được để trống")
    private String sensorCode;

    @NotNull(message = "Giá trị đo (value) không được để trống")
    private Double value;

    private String unit;
    private Double batteryLevel;
    private String status;
    private LocalDateTime recordedAt;

    public SensorDataIngestRequest() {}

    public SensorDataIngestRequest(String sensorCode, Double value, String unit, Double batteryLevel, String status, LocalDateTime recordedAt) {
        this.sensorCode = sensorCode;
        this.value = value;
        this.unit = unit;
        this.batteryLevel = batteryLevel;
        this.status = status;
        this.recordedAt = recordedAt;
    }

    public String getSensorCode() { return sensorCode; }
    public void setSensorCode(String sensorCode) { this.sensorCode = sensorCode; }

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

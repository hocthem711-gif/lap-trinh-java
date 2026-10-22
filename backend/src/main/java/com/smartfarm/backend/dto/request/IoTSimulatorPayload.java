package com.smartfarm.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public class IoTSimulatorPayload {

    @NotBlank(message = "deviceId không được để trống")
    private String deviceId;

    private Long farmId;
    private Long zoneId;
    private double temperature;
    private double humidity;
    private double soilMoisture;
    private double light;
    private String status;
    private long timestamp; // Unix epoch seconds

    public IoTSimulatorPayload() {}

    public IoTSimulatorPayload(String deviceId, Long farmId, Long zoneId, double temperature, double humidity, double soilMoisture, double light, String status, long timestamp) {
        this.deviceId = deviceId;
        this.farmId = farmId;
        this.zoneId = zoneId;
        this.temperature = temperature;
        this.humidity = humidity;
        this.soilMoisture = soilMoisture;
        this.light = light;
        this.status = status;
        this.timestamp = timestamp;
    }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public Long getFarmId() { return farmId; }
    public void setFarmId(Long farmId) { this.farmId = farmId; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public double getTemperature() { return temperature; }
    public void setTemperature(double temperature) { this.temperature = temperature; }

    public double getHumidity() { return humidity; }
    public void setHumidity(double humidity) { this.humidity = humidity; }

    public double getSoilMoisture() { return soilMoisture; }
    public void setSoilMoisture(double soilMoisture) { this.soilMoisture = soilMoisture; }

    public double getLight() { return light; }
    public void setLight(double light) { this.light = light; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}

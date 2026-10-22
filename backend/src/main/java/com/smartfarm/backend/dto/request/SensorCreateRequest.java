package com.smartfarm.backend.dto.request;

import com.smartfarm.backend.entity.SensorType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class SensorCreateRequest {

    @NotBlank(message = "Mã cảm biến không được để trống")
    @Size(max = 50, message = "Mã cảm biến tối đa 50 ký tự")
    private String sensorCode;

    private String name;

    @NotNull(message = "Loại cảm biến không được để trống")
    private SensorType sensorType;

    @NotNull(message = "Zone ID không được để trống")
    private Long zoneId;

    private Double latitude;
    private Double longitude;

    public SensorCreateRequest() {}

    public SensorCreateRequest(String sensorCode, String name, SensorType sensorType, Long zoneId, Double latitude, Double longitude) {
        this.sensorCode = sensorCode;
        this.name = name;
        this.sensorType = sensorType;
        this.zoneId = zoneId;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public String getSensorCode() { return sensorCode; }
    public void setSensorCode(String sensorCode) { this.sensorCode = sensorCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}

package com.smartfarm.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MissionProgressResponse {
    private Long missionId;
    private String missionName;
    private String uavId;
    private String uavCode;
    private String status;
    private Integer currentWaypointOrder;
    private Integer completedWaypoints;
    private Integer totalWaypoints;
    private Double progressPercent;

    // Field names expected by Frontend telemetrySocketClient & flightMonitorService
    private Double latitude;
    private Double longitude;
    private Double altitudeM;
    private Double speedMs;
    private Double batteryPercent;
    private Double headingDeg;

    // Backward-compatible alias fields
    private Double currentLatitude;
    private Double currentLongitude;
    private Double currentAltitude;
    private Double currentSpeed;
    private Double currentBattery;

    private LocalDateTime lastTelemetryAt;

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
        this.currentLatitude = latitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
        this.currentLongitude = longitude;
    }

    public void setAltitudeM(Double altitudeM) {
        this.altitudeM = altitudeM;
        this.currentAltitude = altitudeM;
    }

    public void setSpeedMs(Double speedMs) {
        this.speedMs = speedMs;
        this.currentSpeed = speedMs;
    }

    public void setBatteryPercent(Double batteryPercent) {
        this.batteryPercent = batteryPercent;
        this.currentBattery = batteryPercent;
    }

    public void setUavId(String uavId) {
        this.uavId = uavId;
        this.uavCode = uavId;
    }

    public void setUavCode(String uavCode) {
        this.uavCode = uavCode;
        if (this.uavId == null) {
            this.uavId = uavCode;
        }
    }

    public void setCurrentLatitude(Double currentLatitude) {
        this.currentLatitude = currentLatitude;
        if (this.latitude == null) {
            this.latitude = currentLatitude;
        }
    }

    public void setCurrentLongitude(Double currentLongitude) {
        this.currentLongitude = currentLongitude;
        if (this.longitude == null) {
            this.longitude = currentLongitude;
        }
    }

    public void setCurrentAltitude(Double currentAltitude) {
        this.currentAltitude = currentAltitude;
        if (this.altitudeM == null) {
            this.altitudeM = currentAltitude;
        }
    }

    public void setCurrentSpeed(Double currentSpeed) {
        this.currentSpeed = currentSpeed;
        if (this.speedMs == null) {
            this.speedMs = currentSpeed;
        }
    }

    public void setCurrentBattery(Double currentBattery) {
        this.currentBattery = currentBattery;
        if (this.batteryPercent == null) {
            this.batteryPercent = currentBattery;
        }
    }
}

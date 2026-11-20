package com.smartfarm.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UavTelemetryPayload {
    private String uavId;
    private String missionName;
    private String currentSegment;
    private Integer waypointIndex;
    private Integer totalWaypoints;
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Double altitudeM;
    private Double speed;
    private Double speedMs;
    private Double battery;
    private Double batteryPercent;
    private Double headingDeg;
    private String flightStatus;
    private Long timestamp;

    public Double getEffectiveAltitude() {
        if (altitude != null) return altitude;
        if (altitudeM != null) return altitudeM;
        return 30.0;
    }

    public Double getEffectiveSpeed() {
        if (speed != null) return speed;
        if (speedMs != null) return speedMs;
        return 8.0;
    }

    public Double getEffectiveBattery() {
        if (battery != null) return battery;
        if (batteryPercent != null) return batteryPercent;
        return 100.0;
    }
}

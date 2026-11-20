package com.smartfarm.backend.dto;

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
    private Double speed;
    private Double battery;
    private String flightStatus;
    private Long timestamp;
}

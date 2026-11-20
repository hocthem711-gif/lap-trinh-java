package com.smartfarm.backend.dto;

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
    private String uavCode;
    private String status;
    private Integer currentWaypointOrder;
    private Integer completedWaypoints;
    private Integer totalWaypoints;
    private Double progressPercent;
    private Double currentLatitude;
    private Double currentLongitude;
    private Double currentAltitude;
    private Double currentSpeed;
    private Double currentBattery;
    private LocalDateTime lastTelemetryAt;
}

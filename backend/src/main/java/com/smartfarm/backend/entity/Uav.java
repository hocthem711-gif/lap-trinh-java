package com.smartfarm.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "uavs")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class Uav extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    private String name;
    private String model;
    private String status; // ACTIVE, CHARGING, FLYING, RETURNING, OFFLINE

    private String token;

    @Column(name = "is_connected", columnDefinition = "boolean default false")
    private Boolean isConnected = false;

    // Realtime telemetry fields (LTJ-32)
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Double speed;
    private Double batteryLevel;
    private LocalDateTime lastSeenAt;
}

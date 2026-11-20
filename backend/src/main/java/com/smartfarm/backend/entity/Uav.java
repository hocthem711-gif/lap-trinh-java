package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
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
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Uav extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(length = 100)
    private String name;

    @Column(length = 50)
    private String model;

    @Column(length = 30)
    private String status; // ACTIVE, INACTIVE, FLYING, RETURNING, OFFLINE

    private String token;
    private Boolean isConnected = false;

    // Viễn trắc thời gian thực mới nhất
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Double speed;
    private Double batteryLevel;
    private LocalDateTime lastSeenAt;
}

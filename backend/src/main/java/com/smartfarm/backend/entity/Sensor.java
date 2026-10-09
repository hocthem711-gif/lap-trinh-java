package com.smartfarm.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensors")
public class Sensor extends BaseEntity {

    @Column(name = "sensor_code", nullable = false, unique = true, length = 50)
    private String sensorCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "sensor_type", nullable = false)
    private SensorType sensorType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SensorStatus status = SensorStatus.ACTIVE;

    @Column(name = "installed_at")
    private LocalDateTime installedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    public Sensor() {}

    public Sensor(String sensorCode, SensorType sensorType, Zone zone) {
        this.sensorCode = sensorCode;
        this.sensorType = sensorType;
        this.status = SensorStatus.ACTIVE;
        this.installedAt = LocalDateTime.now();
        this.zone = zone;
    }

    public String getSensorCode() { return sensorCode; }
    public void setSensorCode(String sensorCode) { this.sensorCode = sensorCode; }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public SensorStatus getStatus() { return status; }
    public void setStatus(SensorStatus status) { this.status = status; }

    public LocalDateTime getInstalledAt() { return installedAt; }
    public void setInstalledAt(LocalDateTime installedAt) { this.installedAt = installedAt; }

    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }
}

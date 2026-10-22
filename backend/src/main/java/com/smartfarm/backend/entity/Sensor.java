package com.smartfarm.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensors")
public class Sensor extends BaseEntity {

    @Column(name = "sensor_code", nullable = false, unique = true, length = 50)
    private String sensorCode;

    @Column(name = "sensor_name")
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "sensor_type", nullable = false)
    private SensorType sensorType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SensorStatus status = SensorStatus.ACTIVE;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "installed_at")
    private LocalDateTime installedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    public Sensor() {}

    public Sensor(String sensorCode, String name, SensorType sensorType, Zone zone, Double latitude, Double longitude) {
        this.sensorCode = sensorCode;
        this.name = name;
        this.sensorType = sensorType;
        this.status = SensorStatus.ACTIVE;
        this.installedAt = LocalDateTime.now();
        this.zone = zone;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Sensor(String sensorCode, SensorType sensorType, Zone zone) {
        this(sensorCode, sensorCode, sensorType, zone, null, null);
    }

    public String getSensorCode() { return sensorCode; }
    public void setSensorCode(String sensorCode) { this.sensorCode = sensorCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public SensorStatus getStatus() { return status; }
    public void setStatus(SensorStatus status) { this.status = status; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public LocalDateTime getInstalledAt() { return installedAt; }
    public void setInstalledAt(LocalDateTime installedAt) { this.installedAt = installedAt; }

    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }
}

package com.smartfarm.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_data", indexes = {
        @Index(name = "idx_sensor_recorded", columnList = "sensor_id, recorded_at")
})
public class SensorData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double value;

    @Column(length = 20)
    private String unit;

    @Column(name = "battery_level")
    private Double batteryLevel;

    @Column(length = 20)
    private String status = "NORMAL";

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sensor_id", nullable = false)
    private Sensor sensor;

    public SensorData() {}

    public SensorData(Double value, String unit, LocalDateTime recordedAt, Sensor sensor) {
        this.value = value;
        this.unit = unit;
        this.recordedAt = recordedAt != null ? recordedAt : LocalDateTime.now();
        this.sensor = sensor;
        this.status = "NORMAL";
    }

    public SensorData(Double value, String unit, Double batteryLevel, String status, LocalDateTime recordedAt, Sensor sensor) {
        this.value = value;
        this.unit = unit;
        this.batteryLevel = batteryLevel;
        this.status = status != null ? status : "NORMAL";
        this.recordedAt = recordedAt != null ? recordedAt : LocalDateTime.now();
        this.sensor = sensor;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Double getBatteryLevel() { return batteryLevel; }
    public void setBatteryLevel(Double batteryLevel) { this.batteryLevel = batteryLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }

    public Sensor getSensor() { return sensor; }
    public void setSensor(Sensor sensor) { this.sensor = sensor; }
}

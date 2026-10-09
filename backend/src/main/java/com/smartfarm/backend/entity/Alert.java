package com.smartfarm.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "alerts")
public class Alert extends BaseEntity {

    @Column(nullable = false, length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_level", nullable = false)
    private AlertLevel alertLevel;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sensor_id")
    private Sensor sensor;

    public Alert() {}

    public Alert(String message, AlertLevel alertLevel, Zone zone, Sensor sensor) {
        this.message = message;
        this.alertLevel = alertLevel;
        this.isRead = false;
        this.zone = zone;
        this.sensor = sensor;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public AlertLevel getAlertLevel() { return alertLevel; }
    public void setAlertLevel(AlertLevel alertLevel) { this.alertLevel = alertLevel; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }

    public Sensor getSensor() { return sensor; }
    public void setSensor(Sensor sensor) { this.sensor = sensor; }
}

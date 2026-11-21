package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerts", indexes = {
        @Index(name = "idx_alert_status", columnList = "status"),
        @Index(name = "idx_alert_zone_created", columnList = "zone_id, created_at"),
        @Index(name = "idx_alert_sensor_status", columnList = "sensor_id, status"),
        @Index(name = "idx_alert_is_read", columnList = "is_read")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Alert extends BaseEntity {

    @Column(nullable = false, length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_level", nullable = false)
    private AlertLevel alertLevel;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    // --- CÁC TRƯỜNG CHO TASK LTJ-27 ---
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AlertStatus status = AlertStatus.OPEN;

    @Column(name = "resolved_note", length = 500)
    private String resolvedNote;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
    // ----------------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "sensors"})
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sensor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Sensor sensor;

    public Alert() {}

    public Alert(String message, AlertLevel alertLevel, Zone zone, Sensor sensor) {
        this.message = message;
        this.alertLevel = alertLevel;
        this.isRead = false;
        this.status = AlertStatus.OPEN;
        this.zone = zone;
        this.sensor = sensor;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public AlertLevel getAlertLevel() { return alertLevel; }
    public void setAlertLevel(AlertLevel alertLevel) { this.alertLevel = alertLevel; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public AlertStatus getStatus() { return status; }
    public void setStatus(AlertStatus status) { this.status = status; }

    public String getResolvedNote() { return resolvedNote; }
    public void setResolvedNote(String resolvedNote) { this.resolvedNote = resolvedNote; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }

    public Sensor getSensor() { return sensor; }
    public void setSensor(Sensor sensor) { this.sensor = sensor; }
}

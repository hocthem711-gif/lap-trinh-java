package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "thresholds", indexes = {
        @Index(name = "idx_threshold_zone_type", columnList = "zone_id, sensor_type")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Threshold extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "sensor_type", nullable = false)
    private SensorType sensorType;

    @Column(name = "min_value")
    private Double minValue;

    @Column(name = "max_value")
    private Double maxValue;

    @Column(name = "critical_min")
    private Double criticalMin;

    @Column(name = "critical_max")
    private Double criticalMax;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "sensors"})
    private Zone zone;

    public Threshold() {}

    public Threshold(SensorType sensorType, Double minValue, Double maxValue, Zone zone) {
        this.sensorType = sensorType;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.zone = zone;
    }

    public SensorType getSensorType() { return sensorType; }
    public void setSensorType(SensorType sensorType) { this.sensorType = sensorType; }

    public Double getMinValue() { return minValue; }
    public void setMinValue(Double minValue) { this.minValue = minValue; }

    public Double getMaxValue() { return maxValue; }
    public void setMaxValue(Double maxValue) { this.maxValue = maxValue; }

    public Double getCriticalMin() { return criticalMin; }
    public void setCriticalMin(Double criticalMin) { this.criticalMin = criticalMin; }

    public Double getCriticalMax() { return criticalMax; }
    public void setCriticalMax(Double criticalMax) { this.criticalMax = criticalMax; }

    public Boolean getEnabled() { return enabled != null ? enabled : true; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }
}

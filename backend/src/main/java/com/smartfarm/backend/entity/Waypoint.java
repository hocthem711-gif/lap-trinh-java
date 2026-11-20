package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "waypoints")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Waypoint extends BaseEntity {

    private Integer orderIndex;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private Double altitude;
    private Double speed;

    @Column(length = 30)
    private String actionType = "NORMAL"; // TAKEOFF, NORMAL, HOVER, LANDING

    @Column(length = 30)
    private String visitState = "PENDING"; // PENDING, ACTIVE, COMPLETED

    private String label;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id")
    @JsonBackReference
    private Mission mission;

    public Waypoint(Integer orderIndex, Double latitude, Double longitude, Double altitude, Double speed, String actionType, String visitState, Mission mission) {
        this.orderIndex = orderIndex;
        this.latitude = latitude;
        this.longitude = longitude;
        this.altitude = altitude;
        this.speed = speed;
        this.actionType = actionType;
        this.visitState = visitState;
        this.mission = mission;
    }

    public Integer getOrder() {
        return orderIndex;
    }

    public void setOrder(Integer order) {
        this.orderIndex = order;
    }

    public String getType() {
        return actionType;
    }

    public void setType(String type) {
        this.actionType = type;
    }
}

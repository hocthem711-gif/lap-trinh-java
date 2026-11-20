package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id")
    @JsonBackReference
    private Mission mission;
}

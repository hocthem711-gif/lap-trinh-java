package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "missions")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Mission extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 30)
    private String status = "CREATED"; // CREATED, IN_PROGRESS, FLYING, RETURNING, COMPLETED, CANCELLED

    private Integer currentWaypointOrder = 1;
    private Integer completedWaypoints = 0;
    private Integer totalWaypoints = 0;
    private Double progressPercent = 0.0;
    private LocalDateTime lastTelemetryAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uav_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Uav uav;

    @Column(name = "uav_code_str")
    private String uavId; // Fallback string representation (e.g. UAV-001)

    private Long zoneId;

    @OneToMany(mappedBy = "mission", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @JsonManagedReference
    private List<Waypoint> waypoints = new ArrayList<>();
}

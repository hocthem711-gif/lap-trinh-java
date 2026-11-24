package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "mission_notes", indexes = {
        @Index(name = "idx_note_mission", columnList = "mission_id"),
        @Index(name = "idx_note_priority", columnList = "priority"),
        @Index(name = "idx_note_created", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MissionNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mission_id")
    private Long missionId;

    private String missionCode;
    private String missionName;
    private String uavId;
    private String uavName;
    private Long zoneId;
    private String zoneName;

    @Column(length = 50)
    private String category;

    @Column(length = 30)
    private String priority;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String author;
    private Integer waypointOrder;
    private Double latitude;
    private Double longitude;
    private Double batteryAtNote;
    private String flightStatusAtNote;
    private Boolean isPinned;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (isPinned == null) isPinned = false;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

package com.smartfarm.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_logs")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class SyncLog extends BaseEntity {

    @Column(name = "uav_code", nullable = false)
    private String uavCode;

    @Column(name = "sync_time", nullable = false)
    private LocalDateTime syncTime;

    @Column(length = 30)
    private String status; // SUCCESS, FAILED, COMPLETED

    @Column(length = 500)
    private String message;
}

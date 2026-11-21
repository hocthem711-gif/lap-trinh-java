package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_logs", indexes = {
        @Index(name = "idx_synclog_time", columnList = "sync_time"),
        @Index(name = "idx_synclog_uav_time", columnList = "uav_code, sync_time")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SyncLog extends BaseEntity {

    @Column(name = "uav_code", nullable = false)
    private String uavCode;

    @Column(name = "sync_time", nullable = false)
    private LocalDateTime syncTime;

    @Column(length = 30)
    private String status; // SUCCESS, FAILED, COMPLETED

    @Column(length = 500)
    private String message;

    private String sessionId;

    public String getUavId() {
        return uavCode;
    }

    public String getSyncSessionId() {
        return sessionId != null ? sessionId :
                ("SYNC-" + uavCode + "-" + (syncTime != null ? syncTime.toEpochSecond(java.time.ZoneOffset.UTC) : System.currentTimeMillis() / 1000));
    }
}

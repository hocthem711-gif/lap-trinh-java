package com.smartfarm.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
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

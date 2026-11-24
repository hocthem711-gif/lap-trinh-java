package com.smartfarm.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UavSyncSessionDTO {
    private Long id;
    private String syncSessionId;
    private String uavId;
    private String uavName;
    private Long zoneId;
    private String zoneName;
    private String flightStartTime;
    private String flightEndTime;
    private Integer flightDurationSeconds;
    private Integer totalRecords;
    private Integer syncedRecords;
    private Integer batchSize;
    private Integer batchCount;
    private String status; // COMPLETED, PARTIAL, FAILED, SYNCING
    private String handshakeAt;
    private String lastBatchAt;
    private String completedAt;
    private String failedStep;
    private String errorMessage;

    @Builder.Default
    private List<SyncRecordItemDTO> records = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncRecordItemDTO {
        private String deviceId;
        private Long farmId;
        private Long zoneId;
        private Double temperature;
        private Double humidity;
        private Double soilMoisture;
        private Double light;
        private String status;
        private Long timestamp;
    }
}

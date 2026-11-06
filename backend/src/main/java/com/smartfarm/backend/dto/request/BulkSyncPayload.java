package com.smartfarm.backend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class BulkSyncPayload {

    private String syncSessionId;
    private String uavId;

    @NotEmpty(message = "Danh sách bản ghi không được để trống")
    private List<IoTSimulatorPayload> records;

    public BulkSyncPayload() {}

    public BulkSyncPayload(String syncSessionId, String uavId, List<IoTSimulatorPayload> records) {
        this.syncSessionId = syncSessionId;
        this.uavId = uavId;
        this.records = records;
    }

    public String getSyncSessionId() { return syncSessionId; }
    public void setSyncSessionId(String syncSessionId) { this.syncSessionId = syncSessionId; }

    public String getUavId() { return uavId; }
    public void setUavId(String uavId) { this.uavId = uavId; }

    public List<IoTSimulatorPayload> getRecords() { return records; }
    public void setRecords(List<IoTSimulatorPayload> records) { this.records = records; }
}

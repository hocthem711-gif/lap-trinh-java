package com.smartfarm.backend.dto.response;

public class BulkSyncResponse {

    private String syncSessionId;
    private int totalReceived;
    private int totalSaved;
    private int totalDuplicatesSkipped;
    private String message;

    public BulkSyncResponse() {}

    public BulkSyncResponse(String syncSessionId, int totalReceived, int totalSaved, int totalDuplicatesSkipped, String message) {
        this.syncSessionId = syncSessionId;
        this.totalReceived = totalReceived;
        this.totalSaved = totalSaved;
        this.totalDuplicatesSkipped = totalDuplicatesSkipped;
        this.message = message;
    }

    public String getSyncSessionId() { return syncSessionId; }
    public void setSyncSessionId(String syncSessionId) { this.syncSessionId = syncSessionId; }

    public int getTotalReceived() { return totalReceived; }
    public void setTotalReceived(int totalReceived) { this.totalReceived = totalReceived; }

    public int getTotalSaved() { return totalSaved; }
    public void setTotalSaved(int totalSaved) { this.totalSaved = totalSaved; }

    public int getTotalDuplicatesSkipped() { return totalDuplicatesSkipped; }
    public void setTotalDuplicatesSkipped(int totalDuplicatesSkipped) { this.totalDuplicatesSkipped = totalDuplicatesSkipped; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}

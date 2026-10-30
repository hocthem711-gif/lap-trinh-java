package com.smartfarm.backend.dto.response;

public class DashboardSummaryResponse {

    private long totalSensors;
    private long activeSensors;
    private long inactiveSensors;
    private Double avgBatteryLevel;
    private Double avgTemperature;
    private Double avgHumidity;
    private long totalTelemetryToday;
    private long unreadAlertsCount;

    public DashboardSummaryResponse() {}

    public DashboardSummaryResponse(long totalSensors, long activeSensors, long inactiveSensors,
                                    Double avgBatteryLevel, Double avgTemperature, Double avgHumidity,
                                    long totalTelemetryToday, long unreadAlertsCount) {
        this.totalSensors = totalSensors;
        this.activeSensors = activeSensors;
        this.inactiveSensors = inactiveSensors;
        this.avgBatteryLevel = avgBatteryLevel != null ? Math.round(avgBatteryLevel * 10.0) / 10.0 : null;
        this.avgTemperature = avgTemperature != null ? Math.round(avgTemperature * 10.0) / 10.0 : null;
        this.avgHumidity = avgHumidity != null ? Math.round(avgHumidity * 10.0) / 10.0 : null;
        this.totalTelemetryToday = totalTelemetryToday;
        this.unreadAlertsCount = unreadAlertsCount;
    }

    public long getTotalSensors() { return totalSensors; }
    public void setTotalSensors(long totalSensors) { this.totalSensors = totalSensors; }

    public long getActiveSensors() { return activeSensors; }
    public void setActiveSensors(long activeSensors) { this.activeSensors = activeSensors; }

    public long getInactiveSensors() { return inactiveSensors; }
    public void setInactiveSensors(long inactiveSensors) { this.inactiveSensors = inactiveSensors; }

    public Double getAvgBatteryLevel() { return avgBatteryLevel; }
    public void setAvgBatteryLevel(Double avgBatteryLevel) { this.avgBatteryLevel = avgBatteryLevel; }

    public Double getAvgTemperature() { return avgTemperature; }
    public void setAvgTemperature(Double avgTemperature) { this.avgTemperature = avgTemperature; }

    public Double getAvgHumidity() { return avgHumidity; }
    public void setAvgHumidity(Double avgHumidity) { this.avgHumidity = avgHumidity; }

    public long getTotalTelemetryToday() { return totalTelemetryToday; }
    public void setTotalTelemetryToday(long totalTelemetryToday) { this.totalTelemetryToday = totalTelemetryToday; }

    public long getUnreadAlertsCount() { return unreadAlertsCount; }
    public void setUnreadAlertsCount(long unreadAlertsCount) { this.unreadAlertsCount = unreadAlertsCount; }
}

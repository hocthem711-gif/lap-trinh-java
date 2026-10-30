package com.smartfarm.backend.dto.response;

import java.util.List;

public class TimeSeriesResponse {

    private Long sensorId;
    private String sensorCode;
    private String sensorType;
    private String unit;
    private String interval;
    private List<TimeSeriesPointDTO> dataPoints;

    public TimeSeriesResponse() {}

    public TimeSeriesResponse(Long sensorId, String sensorCode, String sensorType, String unit, String interval, List<TimeSeriesPointDTO> dataPoints) {
        this.sensorId = sensorId;
        this.sensorCode = sensorCode;
        this.sensorType = sensorType;
        this.unit = unit;
        this.interval = interval;
        this.dataPoints = dataPoints;
    }

    public Long getSensorId() { return sensorId; }
    public void setSensorId(Long sensorId) { this.sensorId = sensorId; }

    public String getSensorCode() { return sensorCode; }
    public void setSensorCode(String sensorCode) { this.sensorCode = sensorCode; }

    public String getSensorType() { return sensorType; }
    public void setSensorType(String sensorType) { this.sensorType = sensorType; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getInterval() { return interval; }
    public void setInterval(String interval) { this.interval = interval; }

    public List<TimeSeriesPointDTO> getDataPoints() { return dataPoints; }
    public void setDataPoints(List<TimeSeriesPointDTO> dataPoints) { this.dataPoints = dataPoints; }
}

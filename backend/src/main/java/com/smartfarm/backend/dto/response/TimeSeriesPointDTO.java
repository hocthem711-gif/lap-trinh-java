package com.smartfarm.backend.dto.response;

public class TimeSeriesPointDTO {

    private String timeBucket;
    private Double avgValue;
    private Double minValue;
    private Double maxValue;
    private long sampleCount;

    public TimeSeriesPointDTO() {}

    public TimeSeriesPointDTO(String timeBucket, Double avgValue, Double minValue, Double maxValue, long sampleCount) {
        this.timeBucket = timeBucket;
        this.avgValue = avgValue != null ? Math.round(avgValue * 100.0) / 100.0 : null;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.sampleCount = sampleCount;
    }

    public String getTimeBucket() { return timeBucket; }
    public void setTimeBucket(String timeBucket) { this.timeBucket = timeBucket; }

    public Double getAvgValue() { return avgValue; }
    public void setAvgValue(Double avgValue) {
        this.avgValue = avgValue != null ? Math.round(avgValue * 100.0) / 100.0 : null;
    }

    public Double getMinValue() { return minValue; }
    public void setMinValue(Double minValue) { this.minValue = minValue; }

    public Double getMaxValue() { return maxValue; }
    public void setMaxValue(Double maxValue) { this.maxValue = maxValue; }

    public long getSampleCount() { return sampleCount; }
    public void setSampleCount(long sampleCount) { this.sampleCount = sampleCount; }
}

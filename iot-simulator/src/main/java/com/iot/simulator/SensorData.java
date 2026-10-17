package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.time.Instant;
import java.util.Random;

/**
 * Lớp đại diện cho dữ liệu cảm biến IoT trong Hệ thống Nông Nghiệp Thông Minh (Smart Farm).
 * Dữ liệu này sẽ được serialize thành JSON chuẩn và gửi qua giao thức MQTT.
 *
 * Tích hợp Sprint 2: Hỗ trợ định danh theo Farm ID, Zone ID và chỉ số Soil Moisture (Độ ẩm đất).
 */
public class SensorData {

    private String deviceId;      // Mã định danh thiết bị (ví dụ: DEV-Z1-001)
    private Long farmId;          // Mã trang trại trực thuộc (Farm ID)
    private Long zoneId;          // Mã vùng canh tác (Zone ID)
    private double temperature;   // Nhiệt độ (°C)
    private double humidity;      // Độ ẩm không khí (%RH)
    private double soilMoisture;  // Độ ẩm đất (%)
    private double light;         // Cường độ ánh sáng (lux)
    private String status;        // Trạng thái vận hành: NORMAL hoặc WARNING
    private long timestamp;       // Thời gian Unix epoch (seconds)

    private static final Random random = new Random();
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    public SensorData() {}

    public SensorData(String deviceId, Long farmId, Long zoneId, double temperature, double humidity, double soilMoisture, double light, String status) {
        this.deviceId = deviceId;
        this.farmId = farmId;
        this.zoneId = zoneId;
        this.temperature = temperature;
        this.humidity = humidity;
        this.soilMoisture = soilMoisture;
        this.light = light;
        this.status = status;
        this.timestamp = Instant.now().getEpochSecond();
    }

    public SensorData(String deviceId, double temperature, double humidity, double light) {
        this(deviceId, 1L, 1L, temperature, humidity, 60.0, light, "NORMAL");
    }

    /**
     * Tạo dữ liệu cảm biến ngẫu nhiên theo Zone và Farm trong biên độ vật lý thực tế.
     *
     * @param farmId   Mã trang trại
     * @param zoneId   Mã vùng canh tác
     * @param deviceId Mã thiết bị cảm biến
     * @return SensorData đối tượng dữ liệu cảm biến
     */
    public static SensorData generateRandom(Long farmId, Long zoneId, String deviceId) {
        // Nhiệt độ: 20.0 - 36.0 °C
        double temp = 20.0 + (random.nextDouble() * 16.0);
        temp = Math.round(temp * 10.0) / 10.0;

        // Độ ẩm không khí: 45.0 - 90.0 %
        double hum = 45.0 + (random.nextDouble() * 45.0);
        hum = Math.round(hum * 10.0) / 10.0;

        // Độ ẩm đất: 50.0 - 85.0 % (Rất quan trọng cho cây trồng Smart Farm)
        double soil = 50.0 + (random.nextDouble() * 35.0);
        soil = Math.round(soil * 10.0) / 10.0;

        // Cường độ ánh sáng: 150.0 - 1200.0 lux
        double lux = 150.0 + (random.nextDouble() * 1050.0);
        lux = Math.round(lux * 10.0) / 10.0;

        // Cảnh báo nếu nhiệt độ quá cao (> 34°C) hoặc độ ẩm đất quá thấp (< 55%)
        String status = (temp > 34.0 || soil < 55.0) ? "WARNING" : "NORMAL";

        return new SensorData(deviceId, farmId, zoneId, temp, hum, soil, lux, status);
    }

    /**
     * Phương thức backward compatibility từ Sprint 1.
     */
    public static SensorData generateRandom(String deviceId) {
        return generateRandom(1L, 1L, deviceId);
    }

    /**
     * Chuyển đổi dữ liệu cảm biến thành chuỗi JSON chuẩn.
     */
    public String toJson() {
        return gson.toJson(this);
    }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public Long getFarmId() { return farmId; }
    public void setFarmId(Long farmId) { this.farmId = farmId; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public double getTemperature() { return temperature; }
    public void setTemperature(double temperature) { this.temperature = temperature; }

    public double getHumidity() { return humidity; }
    public void setHumidity(double humidity) { this.humidity = humidity; }

    public double getSoilMoisture() { return soilMoisture; }
    public void setSoilMoisture(double soilMoisture) { this.soilMoisture = soilMoisture; }

    public double getLight() { return light; }
    public void setLight(double light) { this.light = light; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    @Override
    public String toString() {
        return String.format("[Farm: %d | Zone: %d | Device: %s] Temp: %.1f°C | Hum: %.1f%% | Soil: %.1f%% | Lux: %.0f | Status: %s",
                farmId, zoneId, deviceId, temperature, humidity, soilMoisture, light, status);
    }
}

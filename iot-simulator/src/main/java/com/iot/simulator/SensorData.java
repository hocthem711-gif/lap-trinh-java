package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.time.Instant;
import java.util.Random;

/**
 * Lớp đại diện cho dữ liệu cảm biến IoT trong Hệ thống Nông Nghiệp Thông Minh (Smart Farm).
 * Dữ liệu này sẽ được serialize thành JSON chuẩn và gửi qua giao thức MQTT.
 *
 * Tích hợp Sprint 2 (LTJ-10): Hỗ trợ định danh theo Farm ID, Zone ID và chỉ số Soil Moisture (Độ ẩm đất).
 * Nâng cấp Sprint 3 (LTJ-15): Hỗ trợ sinh dữ liệu liên tục (F20), Compact JSON cho Load Test (10-20 sensors @ 1s)
 * và giả lập dữ liệu nhiễu/ngoài ngưỡng vật lý (Anomaly Injection) để kiểm thử bộ lọc dữ liệu rác F19.
 * Nâng cấp Sprint 6 (LTJ-30): Hỗ trợ trường mức pin (batteryLevel) và kịch bản bắn số liệu cực đoan
 * (Nhiệt độ 60°C, Pin 5%) kích hoạt Alert Engine mà không bị F19 loại bỏ.
 */
public class SensorData {

    private String deviceId;      // Mã định danh thiết bị (ví dụ: DEV-Z1-001)
    private Long farmId;          // Mã trang trại trực thuộc (Farm ID)
    private Long zoneId;          // Mã vùng canh tác (Zone ID)
    private double temperature;   // Nhiệt độ (°C)
    private double humidity;      // Độ ẩm không khí (%RH)
    private double soilMoisture;  // Độ ẩm đất (%)
    private double light;         // Cường độ ánh sáng (lux)
    private Double batteryLevel;  // Mức pin (%) - Thêm cho Sprint 6 (LTJ-30)
    private String status;        // Trạng thái vận hành: NORMAL, WARNING, ANOMALY, hoặc CRITICAL
    private long timestamp;       // Thời gian Unix epoch (seconds)

    private static final Random random = new Random();
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private static final Gson compactGson = new Gson();

    public SensorData() {}

    public SensorData(String deviceId, Long farmId, Long zoneId, double temperature, double humidity,
                      double soilMoisture, double light, Double batteryLevel, String status) {
        this.deviceId = deviceId;
        this.farmId = farmId;
        this.zoneId = zoneId;
        this.temperature = temperature;
        this.humidity = humidity;
        this.soilMoisture = soilMoisture;
        this.light = light;
        this.batteryLevel = (batteryLevel != null) ? batteryLevel : 100.0;
        this.status = status;
        this.timestamp = Instant.now().getEpochSecond();
    }

    public SensorData(String deviceId, Long farmId, Long zoneId, double temperature, double humidity,
                      double soilMoisture, double light, String status) {
        this(deviceId, farmId, zoneId, temperature, humidity, soilMoisture, light, 100.0, status);
    }

    public SensorData(String deviceId, double temperature, double humidity, double light) {
        this(deviceId, 1L, 1L, temperature, humidity, 60.0, light, 100.0, "NORMAL");
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

        // Mức pin ngẫu nhiên: 70.0 - 100.0 %
        double battery = 70.0 + (random.nextDouble() * 30.0);
        battery = Math.round(battery * 10.0) / 10.0;

        // Cảnh báo nếu nhiệt độ quá cao (> 34°C) hoặc độ ẩm đất quá thấp (< 55%)
        String status = (temp > 34.0 || soil < 55.0) ? "WARNING" : "NORMAL";

        return new SensorData(deviceId, farmId, zoneId, temp, hum, soil, lux, battery, status);
    }

    /**
     * Sinh dữ liệu cảm biến có xác suất chèn nhiễu/lỗi vật lý (Anomaly Injection)
     * phục vụ kiểm thử tải và kiểm chứng thuật toán lọc dữ liệu rác F19 ở Backend.
     *
     * @param farmId             Mã trang trại
     * @param zoneId             Mã vùng canh tác
     * @param deviceId           Mã thiết bị cảm biến
     * @param anomalyProbability Xác suất sinh dữ liệu lỗi (0.0 đến 1.0, ví dụ 0.05 = 5%)
     * @return SensorData đối tượng dữ liệu cảm biến
     */
    public static SensorData generateWithAnomalyOption(Long farmId, Long zoneId, String deviceId, double anomalyProbability) {
        SensorData data = generateRandom(farmId, zoneId, deviceId);
        if (anomalyProbability > 0 && random.nextDouble() < anomalyProbability) {
            int anomalyType = random.nextInt(3);
            if (anomalyType == 0) {
                data.setTemperature(85.5);   // Vượt ngưỡng vật lý (-10°C đến 60°C)
            } else if (anomalyType == 1) {
                data.setHumidity(135.0);     // Vượt ngưỡng vật lý (0% đến 100%)
            } else {
                data.setSoilMoisture(-12.0); // Âm bất thường (< 0%)
            }
            data.setStatus("ANOMALY");
        }
        return data;
    }

    /**
     * Sinh dữ liệu cực đoan có chủ đích (LTJ-30 - Sprint 6).
     * Dữ liệu nằm trong dải vật lý hợp lệ [-10°C, 60°C] được Backend F19 chấp nhận,
     * nhưng vượt ngưỡng cấu hình cảnh báo an toàn để kích hoạt Alert Engine (CRITICAL/WARNING).
     *
     * @param farmId      Mã trang trại
     * @param zoneId      Mã vùng canh tác
     * @param deviceId    Mã thiết bị
     * @param extremeType Loại cực đoan ("TEMP_60C", "BATTERY_5PCT", "DUAL_CRITICAL")
     * @return SensorData đối tượng dữ liệu cực đoan
     */
    public static SensorData generateExtremeAlertData(Long farmId, Long zoneId, String deviceId, String extremeType) {
        double temp = 28.0;
        double hum = 60.0;
        double soil = 65.0;
        double lux = 500.0;
        double battery = 85.0;
        String status = "CRITICAL";

        if ("TEMP_60C".equalsIgnoreCase(extremeType)) {
            temp = 60.0;          // Cực đoan: Chạm trần vật lý 60.0°C (vượt ngưỡng an toàn 35°C)
            battery = 80.0;
            status = "CRITICAL";
        } else if ("BATTERY_5PCT".equalsIgnoreCase(extremeType)) {
            temp = 28.5;
            battery = 5.0;        // Cực đoan: Pin sụt còn 5.0% (mức khẩn cấp <= 10%)
            status = "CRITICAL";
        } else if ("DUAL_CRITICAL".equalsIgnoreCase(extremeType)) {
            temp = 60.0;          // Cực đoan kép: Cả nhiệt độ 60°C và pin 5% cùng lúc
            battery = 5.0;
            soil = 25.0;          // Hạn hán
            status = "CRITICAL";
        }

        return new SensorData(deviceId, farmId, zoneId, temp, hum, soil, lux, battery, status);
    }

    /**
     * Phương thức backward compatibility từ Sprint 1.
     */
    public static SensorData generateRandom(String deviceId) {
        return generateRandom(1L, 1L, deviceId);
    }

    /**
     * Chuyển đổi dữ liệu cảm biến thành chuỗi JSON chuẩn (Pretty Print).
     */
    public String toJson() {
        return gson.toJson(this);
    }

    /**
     * Chuyển đổi dữ liệu cảm biến thành chuỗi JSON gọn trên 1 dòng (tối ưu băng thông khi Load Test).
     */
    public String toCompactJson() {
        return compactGson.toJson(this);
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

    public Double getBatteryLevel() { return batteryLevel; }
    public void setBatteryLevel(Double batteryLevel) { this.batteryLevel = batteryLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    @Override
    public String toString() {
        return String.format("[Farm: %d | Zone: %d | Device: %s] Temp: %.1f C | Hum: %.1f%% | Soil: %.1f%% | Lux: %.0f | Pin: %.1f%% | Status: %s",
                farmId, zoneId, deviceId, temperature, humidity, soilMoisture, light,
                (batteryLevel != null ? batteryLevel : 100.0), status);
    }
}

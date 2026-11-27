package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.time.Instant;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mô hình dữ liệu viễn trắc cảm biến IoT Smart Farm (LTJ-10, LTJ-15, LTJ-30).
 * Hỗ trợ sinh dữ liệu định kỳ (F20), chèn nhiễu vật lý (F19) và kịch bản cực đoan kích hoạt Alert.
 */
public class SensorData {

    private String deviceId;
    private Long farmId;
    private Long zoneId;
    private double temperature;
    private double humidity;
    private double soilMoisture;
    private double light;
    private Double batteryLevel;
    private String status;
    private long timestamp;

    private static final Random random = new Random();
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private static final Gson compactGson = new Gson();
    private static final ConcurrentHashMap<String, double[]> lastDeviceState = new ConcurrentHashMap<>();

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

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static double stepSmooth(double current, double maxDelta, double min, double max) {
        double delta = (random.nextDouble() * 2.0 - 1.0) * maxDelta;
        double next = Math.max(min, Math.min(max, current + delta));
        return round1(next);
    }

    /**
     * Sinh dữ liệu cảm biến dao động mượt quanh nền vi khí hậu thực tế của từng Zone Đà Lạt
     * (tránh nhảy số đột ngột phi vật lý giữa hai lần đo liên tiếp).
     */
    public static SensorData generateRandom(Long farmId, Long zoneId, String deviceId) {
        String key = (deviceId != null && !deviceId.isBlank()) ? deviceId : ("ZONE-" + zoneId);
        long z = (zoneId != null) ? zoneId : 1L;

        double[] state = lastDeviceState.compute(key, (k, prev) -> {
            if (prev == null) {
                int hashOffset = Math.abs(k.hashCode() % 5);
                double baseTemp = (z == 2L ? 23.2 : (z == 3L ? 25.8 : 24.6)) + hashOffset * 0.2;
                double baseHum  = (z == 2L ? 72.0 : (z == 3L ? 64.0 : 68.5)) + hashOffset * 0.5;
                double baseSoil = (z == 2L ? 70.0 : (z == 3L ? 63.5 : 67.0)) + hashOffset * 0.4;
                double baseLux  = (z == 2L ? 910.0 : (z == 3L ? 1040.0 : 860.0)) + hashOffset * 12.0;
                double baseBat  = 94.0 - (hashOffset * 1.5);
                return new double[]{round1(baseTemp), round1(baseHum), round1(baseSoil), Math.round(baseLux), round1(baseBat)};
            }
            double nextTemp = stepSmooth(prev[0], 0.2, 21.0, 33.5);
            double nextHum  = stepSmooth(prev[1], 0.5, 52.0, 84.0);
            double nextSoil = stepSmooth(prev[2], 0.4, 56.0, 80.0);
            double nextLux  = Math.round(stepSmooth(prev[3], 12.0, 600.0, 1180.0));
            double nextBat  = round1(Math.max(75.0, prev[4] - (random.nextDouble() < 0.25 ? 0.1 : 0.0)));
            return new double[]{nextTemp, nextHum, nextSoil, nextLux, nextBat};
        });

        String status = (state[0] > 34.0 || state[2] < 55.0) ? "WARNING" : "NORMAL";
        return new SensorData(deviceId, farmId, zoneId, state[0], state[1], state[2], state[3], state[4], status);
    }

    public static SensorData generateRandom(String deviceId) {
        return generateRandom(1L, 1L, deviceId);
    }

    /** Sinh dữ liệu kèm xác suất chèn nhiễu ngoài biên độ vật lý để kiểm định bộ lọc F19. */
    public static SensorData generateWithAnomalyOption(Long farmId, Long zoneId, String deviceId, double anomalyProbability) {
        SensorData data = generateRandom(farmId, zoneId, deviceId);
        if (anomalyProbability > 0 && random.nextDouble() < anomalyProbability) {
            switch (random.nextInt(3)) {
                case 0 -> data.setTemperature(85.5);
                case 1 -> data.setHumidity(135.0);
                default -> data.setSoilMoisture(-12.0);
            }
            data.setStatus("ANOMALY");
        }
        return data;
    }

    /** Sinh dữ liệu cực đoan hợp lệ vật lý [-10°C, 60°C] nhằm kích hoạt Alert Engine (LTJ-30). */
    public static SensorData generateExtremeAlertData(Long farmId, Long zoneId, String deviceId, String extremeType) {
        String mode = (extremeType != null) ? extremeType.toUpperCase() : "";
        return switch (mode) {
            case "TEMP_60C" -> new SensorData(deviceId, farmId, zoneId, 60.0, 60.0, 65.0, 500.0, 80.0, "CRITICAL");
            case "BATTERY_5PCT" -> new SensorData(deviceId, farmId, zoneId, 28.5, 60.0, 65.0, 500.0, 5.0, "CRITICAL");
            case "DUAL_CRITICAL" -> new SensorData(deviceId, farmId, zoneId, 60.0, 60.0, 25.0, 500.0, 5.0, "CRITICAL");
            default -> new SensorData(deviceId, farmId, zoneId, 28.0, 60.0, 65.0, 500.0, 85.0, "CRITICAL");
        };
    }

    public String toJson() { return gson.toJson(this); }
    public String toCompactJson() { return compactGson.toJson(this); }

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

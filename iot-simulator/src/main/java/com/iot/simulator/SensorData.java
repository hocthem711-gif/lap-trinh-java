package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.time.Instant;
import java.util.Random;

/**
 * Lớp đại diện cho dữ liệu cảm biến IoT.
 * Dữ liệu này sẽ được serialize thành JSON và gửi qua MQTT.
 */
public class SensorData {

    private String deviceId;
    private double temperature;   // Nhiệt độ (°C)
    private double humidity;      // Độ ẩm (%)
    private double light;         // Ánh sáng (lux)
    private long timestamp;       // Thời gian Unix (epoch seconds)

    private static final Random random = new Random();
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    public SensorData(String deviceId, double temperature, double humidity, double light) {
        this.deviceId = deviceId;
        this.temperature = temperature;
        this.humidity = humidity;
        this.light = light;
        this.timestamp = Instant.now().getEpochSecond();
    }

    /**
     * Tạo dữ liệu cảm biến ngẫu nhiên trong phạm vi thực tế.
     *
     * @param deviceId ID của thiết bị
     * @return SensorData với giá trị ngẫu nhiên
     */
    public static SensorData generateRandom(String deviceId) {
        // Nhiệt độ: 18.0 - 38.0 °C
        double temp = 18.0 + (random.nextDouble() * 20.0);
        temp = Math.round(temp * 10.0) / 10.0;

        // Độ ẩm: 30 - 90 %
        double hum = 30.0 + (random.nextDouble() * 60.0);
        hum = Math.round(hum * 10.0) / 10.0;

        // Ánh sáng: 100 - 1000 lux
        double lux = 100.0 + (random.nextDouble() * 900.0);
        lux = Math.round(lux * 10.0) / 10.0;

        return new SensorData(deviceId, temp, hum, lux);
    }

    /**
     * Chuyển đổi dữ liệu cảm biến thành chuỗi JSON.
     */
    public String toJson() {
        return gson.toJson(this);
    }

    // ===== Getters =====

    public String getDeviceId() {
        return deviceId;
    }

    public double getTemperature() {
        return temperature;
    }

    public double getHumidity() {
        return humidity;
    }

    public double getLight() {
        return light;
    }

    public long getTimestamp() {
        return timestamp;
    }

    @Override
    public String toString() {
        return String.format("[%s] Temp=%.1f°C | Humidity=%.1f%% | Light=%.1f lux | Time=%d",
                deviceId, temperature, humidity, light, timestamp);
    }
}

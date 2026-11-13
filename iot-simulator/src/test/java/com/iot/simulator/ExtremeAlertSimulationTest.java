package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử giả lập bắn dữ liệu cực đoan kích hoạt Alert (LTJ-30 - Sprint 6).
 */
class ExtremeAlertSimulationTest {

    private final Gson gson = new Gson();

    @Test
    @DisplayName("TC-01: Nhiệt độ cực đoan 60.0°C hợp lệ dải vật lý F19 [-10°C, 60°C] nhưng kích hoạt Alert")
    void testTemperatureExtremeWithinPhysicalBounds() {
        SensorData data = SensorData.generateExtremeAlertData(1L, 1L, "DEV-Z1-001", "TEMP_60C");

        assertEquals(60.0, data.getTemperature(), 0.001);
        assertEquals("CRITICAL", data.getStatus());
        assertTrue(data.getTemperature() >= -10.0 && data.getTemperature() <= 60.0,
                "Nhiệt độ 60.0°C phải nằm trong biên độ vật lý hợp lệ của cảm biến để không bị F19 hủy");
        assertTrue(data.getTemperature() > 35.0,
                "Nhiệt độ 60.0°C phải vượt ngưỡng an toàn cấu hình (35°C) để kích hoạt Alert CRITICAL");
    }

    @Test
    @DisplayName("TC-02: Mức pin khẩn cấp 5.0% hợp lệ dải [0, 100] và kích hoạt Low Battery Alert")
    void testBatteryLevelLowCritical() {
        SensorData data = SensorData.generateExtremeAlertData(1L, 2L, "DEV-Z2-002", "BATTERY_5PCT");

        assertNotNull(data.getBatteryLevel());
        assertEquals(5.0, data.getBatteryLevel(), 0.001);
        assertEquals("CRITICAL", data.getStatus());
        assertTrue(data.getBatteryLevel() >= 0.0 && data.getBatteryLevel() <= 100.0,
                "Mức pin 5.0% phải nằm trong khoảng hợp lệ [0, 100%]");
        assertTrue(data.getBatteryLevel() <= 10.0,
                "Mức pin 5.0% phải nằm dưới ngưỡng pin yếu (10%) để kích hoạt cảnh báo hạ cánh/sạc");
    }

    @Test
    @DisplayName("TC-03: Kịch bản cực đoan kép (Nhiệt độ 60.0°C và Pin 5.0%)")
    void testDualExtremeAlertGeneration() {
        SensorData data = SensorData.generateExtremeAlertData(1L, 3L, "DEV-Z3-003", "DUAL_CRITICAL");

        assertEquals(60.0, data.getTemperature(), 0.001);
        assertEquals(5.0, data.getBatteryLevel(), 0.001);
        assertEquals(25.0, data.getSoilMoisture(), 0.001);
        assertEquals("CRITICAL", data.getStatus());

        String json = data.toCompactJson();
        JsonObject obj = gson.fromJson(json, JsonObject.class);

        assertEquals("DEV-Z3-003", obj.get("deviceId").getAsString());
        assertEquals(60.0, obj.get("temperature").getAsDouble(), 0.001);
        assertEquals(5.0, obj.get("batteryLevel").getAsDouble(), 0.001);
        assertEquals("CRITICAL", obj.get("status").getAsString());
    }

    @Test
    @DisplayName("TC-04: Tương thích định dạng JSON với Backend DTO (IoTSimulatorPayload)")
    void testJsonPayloadFieldCompatibility() {
        SensorData data = SensorData.generateRandom(1L, 1L, "DEV-Z1-TEST");
        String json = data.toCompactJson();
        JsonObject obj = gson.fromJson(json, JsonObject.class);

        assertTrue(obj.has("deviceId"));
        assertTrue(obj.has("farmId"));
        assertTrue(obj.has("zoneId"));
        assertTrue(obj.has("temperature"));
        assertTrue(obj.has("humidity"));
        assertTrue(obj.has("soilMoisture"));
        assertTrue(obj.has("light"));
        assertTrue(obj.has("batteryLevel"));
        assertTrue(obj.has("status"));
        assertTrue(obj.has("timestamp"));
    }
}

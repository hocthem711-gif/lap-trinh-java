package com.smartfarm.backend.validation;

import com.smartfarm.backend.entity.SensorType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Unit Tests - SensorDataValidator (F19 Physical Range Validation)")
class SensorDataValidatorTest {

    private SensorDataValidator validator;

    @BeforeEach
    void setUp() {
        validator = new SensorDataValidator();
    }

    @Test
    @DisplayName("Nhiệt độ hợp lệ trong dải -10°C đến 60°C phải trả về ok")
    void testTemperatureValid() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.TEMPERATURE, 25.5, 90.0, LocalDateTime.now());
        assertTrue(result.isValid());
    }

    @Test
    @DisplayName("Nhiệt độ quá thấp (< -10°C) phải bị từ chối")
    void testTemperatureTooLow() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.TEMPERATURE, -15.0, 90.0, LocalDateTime.now());
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("Nhiệt độ"));
    }

    @Test
    @DisplayName("Nhiệt độ quá cao (> 60°C) phải bị từ chối")
    void testTemperatureTooHigh() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.TEMPERATURE, 75.0, 90.0, LocalDateTime.now());
        assertFalse(result.isValid());
    }

    @Test
    @DisplayName("Độ ẩm không khí 0-100% hợp lệ")
    void testHumidityValid() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.HUMIDITY, 70.0, 85.0, LocalDateTime.now());
        assertTrue(result.isValid());
    }

    @Test
    @DisplayName("Độ ẩm không khí vượt quá 100% phải bị từ chối")
    void testHumidityOutOfRange() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.HUMIDITY, 105.0, 85.0, LocalDateTime.now());
        assertFalse(result.isValid());
    }

    @Test
    @DisplayName("Độ ẩm đất âm (< 0%) phải bị từ chối")
    void testSoilMoistureNegative() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.SOIL_MOISTURE, -5.0, 85.0, LocalDateTime.now());
        assertFalse(result.isValid());
    }

    @Test
    @DisplayName("Mức pin vượt quá 100% phải bị từ chối")
    void testInvalidBatteryLevel() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.TEMPERATURE, 25.0, 150.0, LocalDateTime.now());
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("Mức pin"));
    }

    @Test
    @DisplayName("Thời gian đo trong tương lai xa phải bị từ chối")
    void testFutureTimestamp() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.TEMPERATURE, 25.0, 80.0, LocalDateTime.now().plusDays(2));
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("tương lai"));
    }

    @Test
    @DisplayName("Giá trị null phải bị từ chối")
    void testNullValue() {
        SensorDataValidator.ValidationResult result = validator.validateReading(
                SensorType.TEMPERATURE, null, 80.0, LocalDateTime.now());
        assertFalse(result.isValid());
    }
}

package com.smartfarm.backend.validation;

import com.smartfarm.backend.entity.SensorType;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class SensorDataValidator {

    public static class ValidationResult {
        private final boolean valid;
        private final String message;

        public ValidationResult(boolean valid, String message) {
            this.valid = valid;
            this.message = message;
        }

        public static ValidationResult ok() {
            return new ValidationResult(true, "Dữ liệu hợp lệ");
        }

        public static ValidationResult fail(String message) {
            return new ValidationResult(false, message);
        }

        public boolean isValid() { return valid; }
        public String getMessage() { return message; }
    }

    /**
     * Thuật toán kiểm tra tính hợp lệ của số liệu cảm biến (F19)
     * Phát hiện số liệu vượt biên độ vật lý thực tế hoặc sai định dạng.
     */
    public ValidationResult validateReading(SensorType sensorType, Double value, Double batteryLevel, LocalDateTime recordedAt) {
        if (value == null) {
            return ValidationResult.fail("Giá trị đo (value) không được để null");
        }

        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return ValidationResult.fail("Giá trị đo không phải là số hợp lệ");
        }

        // 1. Kiểm tra biên độ vật lý theo từng loại cảm biến
        switch (sensorType) {
            case TEMPERATURE:
                if (value < -10.0 || value > 60.0) {
                    return ValidationResult.fail(String.format("Nhiệt độ %.1f°C bất thường (vượt dải an toàn -10°C đến 60°C)", value));
                }
                break;
            case HUMIDITY:
                if (value < 0.0 || value > 100.0) {
                    return ValidationResult.fail(String.format("Độ ẩm không khí %.1f%% không hợp lệ (phải từ 0%% đến 100%%)", value));
                }
                break;
            case SOIL_MOISTURE:
                if (value < 0.0 || value > 100.0) {
                    return ValidationResult.fail(String.format("Độ ẩm đất %.1f%% không hợp lệ (phải từ 0%% đến 100%%)", value));
                }
                break;
            case LIGHT:
                if (value < 0.0 || value > 150000.0) {
                    return ValidationResult.fail(String.format("Cường độ ánh sáng %.1f lux bất thường (phải từ 0 đến 150,000 lux)", value));
                }
                break;
            case CO2:
                if (value < 0.0 || value > 5000.0) {
                    return ValidationResult.fail(String.format("Nồng độ CO2 %.1f ppm bất thường (phải từ 0 đến 5,000 ppm)", value));
                }
                break;
        }

        // 2. Kiểm tra mức pin (nếu có)
        if (batteryLevel != null && (batteryLevel < 0.0 || batteryLevel > 100.0)) {
            return ValidationResult.fail(String.format("Mức pin %.1f%% không hợp lệ (phải từ 0%% đến 100%%)", batteryLevel));
        }

        // 3. Kiểm tra thời gian đo
        if (recordedAt != null) {
            LocalDateTime now = LocalDateTime.now();
            if (recordedAt.isAfter(now.plusMinutes(5))) {
                return ValidationResult.fail("Thời gian đo ở tương lai bất thường");
            }
            if (recordedAt.isBefore(now.minusDays(30))) {
                return ValidationResult.fail("Thời gian đo quá cũ (vượt quá 30 ngày)");
            }
        }

        return ValidationResult.ok();
    }
}

package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Unit Tests - HealthCheckController (Dev 1 - LTJ-1 & LTJ-36)")
class HealthCheckControllerTest {

    private final HealthCheckController controller = new HealthCheckController();

    @Test
    @DisplayName("Health check trả về status UP và đầy đủ thông tin hệ thống")
    void testHealthCheckReturnsUpStatus() {
        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.healthCheck();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(200, response.getBody().getStatus());

        Map<String, Object> data = response.getBody().getData();
        assertNotNull(data);
        assertEquals("UP", data.get("status"));
        assertEquals("Smart Farm Backend Core", data.get("service"));
        assertEquals("1.0.0", data.get("version"));
        assertEquals("Sprint 8 (Complete)", data.get("currentSprint"));
        assertEquals("Nguyễn Trần Đình Hiệu (Dev 1)", data.get("leadDeveloper"));
        assertNotNull(data.get("jvmUptimeSeconds"));
        assertNotNull(data.get("freeMemoryMB"));
        assertNotNull(data.get("totalMemoryMB"));
        assertNotNull(data.get("timestamp"));
    }
}

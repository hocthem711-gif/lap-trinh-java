package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping
@Tag(name = "Health Check", description = "API Kiểm tra trạng thái hoạt động & Chẩn đoán hệ thống Backend Core (Dev 1 - LTJ-1 & LTJ-36)")
public class HealthCheckController {

    @GetMapping("/health")
    @Operation(summary = "Kiểm tra hệ thống Backend", description = "Trả về trạng thái hoạt động, tài nguyên JVM và tiến độ Sprint của Smart Farm Backend")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> healthInfo = new LinkedHashMap<>();
        healthInfo.put("status", "UP");
        healthInfo.put("service", "Smart Farm Backend Core");
        healthInfo.put("version", "1.0.0");
        healthInfo.put("currentSprint", "Sprint 8 (Complete)");
        healthInfo.put("leadDeveloper", "Nguyễn Trần Đình Hiệu (Dev 1)");
        healthInfo.put("jvmUptimeSeconds", ManagementFactory.getRuntimeMXBean().getUptime() / 1000);
        healthInfo.put("freeMemoryMB", Runtime.getRuntime().freeMemory() / (1024 * 1024));
        healthInfo.put("totalMemoryMB", Runtime.getRuntime().totalMemory() / (1024 * 1024));
        healthInfo.put("activeThreads", Thread.activeCount());
        healthInfo.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.ok(ApiResponse.success("Hệ thống hoạt động bình thường", healthInfo));
    }
}

package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping
@Tag(name = "Health Check", description = "API Kiểm tra trạng thái hoạt động của Backend Core")
public class HealthCheckController {

    @GetMapping("/health")
    @Operation(summary = "Kiểm tra hệ thống Backend", description = "Trả về trạng thái hoạt động của Smart Agriculture Monitoring Backend System")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> healthInfo = new HashMap<>();
        healthInfo.put("status", "UP");
        healthInfo.put("service", "Smart Farm Backend Core");
        healthInfo.put("sprint", "Sprint 1");
        healthInfo.put("task", "LTJ-1");

        return ResponseEntity.ok(ApiResponse.success("Hệ thống hoạt động bình thường", healthInfo));
    }
}

package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.LatestSensorTelemetryResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.service.SensorDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/sensor-data")
@Tag(name = "6. Sensor Data & Telemetry", description = "APIs Thu nạp & Truy vấn Dữ liệu Cảm biến Realtime (F04, F19)")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    @PostMapping
    @Operation(summary = "Thu nạp dữ liệu cảm biến đơn lẻ (F04, F19)", description = "Lưu trữ số liệu đo từ trạm IoT hoặc cảm biến đơn lẻ kèm kiểm định dải vật lý hợp lệ")
    public ResponseEntity<ApiResponse<SensorDataResponse>> ingestReading(@Valid @RequestBody SensorDataIngestRequest request) {
        SensorDataResponse response = sensorDataService.ingestData(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Lưu dữ liệu cảm biến thành công!", response));
    }

    @PostMapping("/simulator")
    @Operation(summary = "Thu nạp gói tin từ IoT Simulator (Dev 5)", description = "Nhận gói tin telemetry đa chỉ số (nhiệt độ, độ ẩm, độ ẩm đất, ánh sáng) từ mô phỏng IoT")
    public ResponseEntity<ApiResponse<List<SensorDataResponse>>> ingestSimulatorPayload(@Valid @RequestBody IoTSimulatorPayload payload) {
        List<SensorDataResponse> list = sensorDataService.ingestSimulatorPayload(payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đã tiếp nhận và xử lý telemetry từ simulator thành công!", list));
    }

    @GetMapping("/latest")
    @Operation(summary = "Lấy dữ liệu viễn trắc mới nhất toàn bộ cảm biến", description = "Cung cấp tọa độ GPS, giá trị đo mới nhất, trạng thái và pin phục vụ Leaflet Map (Dev 3) và Realtime Table (Dev 4)")
    public ResponseEntity<ApiResponse<List<LatestSensorTelemetryResponse>>> getLatestTelemetryAll() {
        List<LatestSensorTelemetryResponse> list = sensorDataService.getLatestTelemetryAll();
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu viễn trắc mới nhất thành công!", list));
    }

    @GetMapping("/latest/zone/{zoneId}")
    @Operation(summary = "Lấy dữ liệu viễn trắc mới nhất theo Vùng canh tác", description = "Lọc telemetry mới nhất cho các cảm biến thuộc về một Vùng cụ thể")
    public ResponseEntity<ApiResponse<List<LatestSensorTelemetryResponse>>> getLatestTelemetryByZone(@PathVariable Long zoneId) {
        List<LatestSensorTelemetryResponse> list = sensorDataService.getLatestTelemetryByZone(zoneId);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu viễn trắc theo vùng thành công!", list));
    }

    @GetMapping("/history")
    @Operation(summary = "Truy vấn lịch sử dữ liệu cảm biến", description = "Lấy chuỗi thời gian số liệu đo phục vụ vẽ biểu đồ xu hướng nhiệt ẩm")
    public ResponseEntity<ApiResponse<List<SensorDataResponse>>> getHistoricalData(
            @RequestParam Long sensorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<SensorDataResponse> list = sensorDataService.getHistoricalData(sensorId, start, end);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử dữ liệu thành công!", list));
    }
}

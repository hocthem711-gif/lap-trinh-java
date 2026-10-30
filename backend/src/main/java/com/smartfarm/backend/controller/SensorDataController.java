package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.*;
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
@Tag(name = "6. Sensor Data & Telemetry", description = "APIs Thu nạp & Truy vấn Dữ liệu Cảm biến Realtime (F04, F06, F19)")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    @PostMapping
    @Operation(summary = "Thu nạp dữ liệu cảm biến đơn lẻ (F04, F19)", description = "Lưu trữ số liệu đo từ trạm IoT kèm kiểm định dải vật lý hợp lệ")
    public ResponseEntity<ApiResponse<SensorDataResponse>> ingestReading(@Valid @RequestBody SensorDataIngestRequest request) {
        SensorDataResponse response = sensorDataService.ingestData(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Lưu dữ liệu cảm biến thành công!", response));
    }

    @PostMapping("/simulator")
    @Operation(summary = "Thu nạp gói tin từ IoT Simulator (Dev 5)", description = "Nhận gói tin telemetry đa chỉ số từ mô phỏng IoT")
    public ResponseEntity<ApiResponse<List<SensorDataResponse>>> ingestSimulatorPayload(@Valid @RequestBody IoTSimulatorPayload payload) {
        List<SensorDataResponse> list = sensorDataService.ingestSimulatorPayload(payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đã tiếp nhận telemetry thành công!", list));
    }

    @GetMapping("/latest")
    @Operation(summary = "Lấy dữ liệu viễn trắc mới nhất toàn bộ cảm biến", description = "Cung cấp tọa độ GPS, giá trị đo mới nhất phục vụ Leaflet Map (Dev 3)")
    public ResponseEntity<ApiResponse<List<LatestSensorTelemetryResponse>>> getLatestTelemetryAll() {
        List<LatestSensorTelemetryResponse> list = sensorDataService.getLatestTelemetryAll();
        return ResponseEntity.ok(ApiResponse.success("Lấy viễn trắc mới nhất thành công!", list));
    }

    @GetMapping("/latest/zone/{zoneId}")
    @Operation(summary = "Lấy dữ liệu viễn trắc mới nhất theo Vùng canh tác", description = "Lọc telemetry mới nhất cho các cảm biến trong 1 Zone")
    public ResponseEntity<ApiResponse<List<LatestSensorTelemetryResponse>>> getLatestTelemetryByZone(@PathVariable Long zoneId) {
        List<LatestSensorTelemetryResponse> list = sensorDataService.getLatestTelemetryByZone(zoneId);
        return ResponseEntity.ok(ApiResponse.success("Lấy viễn trắc theo vùng thành công!", list));
    }

    @GetMapping("/history")
    @Operation(summary = "Truy vấn lịch sử dữ liệu cảm biến cơ bản", description = "Lấy chuỗi thời gian số liệu đo")
    public ResponseEntity<ApiResponse<List<SensorDataResponse>>> getHistoricalData(
            @RequestParam Long sensorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<SensorDataResponse> list = sensorDataService.getHistoricalData(sensorId, start, end);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử dữ liệu thành công!", list));
    }

    @GetMapping("/history/paged")
    @Operation(summary = "Truy vấn lịch sử dữ liệu phân trang (F06 - Tối ưu hiệu năng)",
               description = "Phân trang kết hợp lọc theo sensorId/zoneId và mốc thời gian")
    public ResponseEntity<ApiResponse<PagedResponse<SensorDataResponse>>> getHistoricalDataPaged(
            @RequestParam(required = false) Long sensorId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PagedResponse<SensorDataResponse> response = sensorDataService.getHistoricalDataPaged(
                sensorId, zoneId, start, end, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử phân trang thành công!", response));
    }

    @GetMapping("/time-series")
    @Operation(summary = "Lấy chuỗi dữ liệu tổng hợp theo giờ/ngày cho biểu đồ Chart.js (Dev 3 - LTJ-18)",
               description = "Gom nhóm theo khung giờ (HOURLY) hoặc ngày (DAILY) tính sẵn min/max/avg")
    public ResponseEntity<ApiResponse<TimeSeriesResponse>> getTimeSeriesData(
            @RequestParam Long sensorId,
            @RequestParam(defaultValue = "HOURLY") String interval,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        TimeSeriesResponse response = sensorDataService.getTimeSeriesData(sensorId, interval, start, end);
        return ResponseEntity.ok(ApiResponse.success("Lấy chuỗi thời gian thành công!", response));
    }

    @GetMapping("/dashboard/summary")
    @Operation(summary = "Thống kê tổng quan Dashboard toàn hệ thống (LTJ-16)",
               description = "Tính toán số lượng, % pin trung bình, nhiệt độ và độ ẩm trung bình tối ưu trực tiếp từ Database")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getDashboardSummary() {
        DashboardSummaryResponse response = sensorDataService.getDashboardSummary();
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê Dashboard thành công!", response));
    }

    @GetMapping("/dashboard/summary/zone/{zoneId}")
    @Operation(summary = "Thống kê tổng quan Dashboard theo Vùng canh tác (LTJ-16)",
               description = "Lọc số lượng và chỉ số trung bình theo từng Vùng cụ thể")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getDashboardSummaryByZone(@PathVariable Long zoneId) {
        DashboardSummaryResponse response = sensorDataService.getDashboardSummaryByZone(zoneId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê Dashboard theo vùng thành công!", response));
    }
}
